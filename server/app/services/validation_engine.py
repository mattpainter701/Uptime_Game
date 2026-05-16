"""
NetOps Tower - Validation Engine v2

Robust, extensible ticket validation supporting:
- Ping, command-output, config-check, API-check pipeline
- Partial-success grading with configurable thresholds
- Validation timing with convergence delays
- Multi-step validation scripts
- Pre-flight validation (verify broken state)
- Per-criterion pass/fail reports with hints
- Mock CLI fallback when EVE-NG unavailable
- Anti-cheat detection
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable, Awaitable
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================================================
# Types
# ============================================================================

class CheckType(str, Enum):
    """Types of validation checks."""
    PING = "ping"
    COMMAND = "command"
    CONFIG = "config"
    API = "api"


class CriterionStatus(str, Enum):
    """Status of a single validation criterion."""
    PASS = "pass"
    FAIL = "fail"
    SKIPPED = "skipped"
    TIMED_OUT = "timed_out"
    ERROR = "error"


class ValidationOutcome(str, Enum):
    """Overall validation outcome."""
    FULL_PASS = "full_pass"
    PARTIAL_PASS = "partial_pass"
    FULL_FAIL = "full_fail"
    ERROR = "error"


@dataclass
class CriterionResult:
    """Result of checking a single validation criterion."""
    criterion_id: str
    check_type: str  # 'ping', 'command', 'config', 'api'
    status: CriterionStatus
    passed: bool
    message: str = ""
    hint: str = ""
    duration_ms: float = 0.0
    expected: Any = None
    actual: Any = None
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PreflightResult:
    """Result of a pre-flight validation check."""
    passed: bool
    lab_correctly_broken: bool
    checks: List[CriterionResult] = field(default_factory=list)
    message: str = ""


@dataclass
class ValidationReport:
    """Complete validation report for a ticket."""
    ticket_id: str
    outcome: ValidationOutcome
    success: bool  # true if full_pass or partial_pass
    total_criteria: int
    passed_criteria: int
    failed_criteria: int
    score: float  # 0.0 to 1.0
    reward_multiplier: float  # applied to base reward
    criteria_results: List[CriterionResult] = field(default_factory=list)
    preflight: Optional[PreflightResult] = None
    anti_cheat_flags: List[str] = field(default_factory=list)
    total_duration_ms: float = 0.0
    message: str = ""
    hints: List[str] = field(default_factory=list)


@dataclass
class ValidationScript:
    """A multi-step validation script with optional delays between steps."""
    steps: List["ValidationStep"] = field(default_factory=list)
    convergence_delay_ms: int = 0  # default delay between steps


@dataclass
class ValidationStep:
    """A single step in a validation script."""
    criteria: "ValidationCriterion"
    delay_before_ms: int = 0  # delay before executing this step
    retry_count: int = 0  # number of retries if this step fails
    retry_delay_ms: int = 1000  # delay between retries


@dataclass
class ValidationCriterion:
    """A single validation criterion extracted from ticket criteria."""
    criterion_id: str
    check_type: str  # 'ping', 'command', 'config', 'api'
    params: Dict[str, Any]
    weight: float = 1.0  # relative weight for scoring
    required: bool = True  # if True, failure blocks full_pass
    convergence_delay_ms: int = 0  # delay before checking (e.g., for OSPF convergence)
    hint_on_fail: str = ""  # hint to show player if this criterion fails
    anti_cheat: bool = False  # if True, bypassing this check triggers anti-cheat flag


# ============================================================================
# Grading Configuration
# ============================================================================

@dataclass
class GradingConfig:
    """Configuration for partial-success grading."""
    full_pass_threshold: float = 1.0  # 100% for full pass
    partial_pass_threshold: float = 0.6  # 60% for partial pass
    partial_reward_floor: float = 0.3  # minimum reward for partial (30%)
    reward_scaling: str = "linear"  # "linear" or "stepped"
    reward_steps: List[Dict[str, Any]] = field(default_factory=lambda: [
        {"threshold": 1.0, "multiplier": 1.0},
        {"threshold": 0.8, "multiplier": 0.7},
        {"threshold": 0.6, "multiplier": 0.4},
        {"threshold": 0.4, "multiplier": 0.2},
        {"threshold": 0.0, "multiplier": 0.0},
    ])


# ============================================================================
# Validation Context
# ============================================================================

@dataclass
class ValidationContext:
    """Context passed to validation checks."""
    ticket_id: str
    lab_path: str
    mock_cli_state: Optional[Dict[str, Any]] = None  # mock CLI state if using fallback
    eveng_available: bool = False
    command_history: List[Dict[str, Any]] = field(default_factory=list)  # player's CLI commands
    session_started_at: float = 0.0
    variables: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# Validation Engine
# ============================================================================

class ValidationEngine:
    """
    Core validation engine that runs validation pipelines against tickets.

    Supports both real EVE-NG validation and mock CLI fallback.
    """

    def __init__(
        self,
        grading_config: Optional[GradingConfig] = None,
        eveng_checker: Optional[Callable[..., Awaitable[Any]]] = None,
        mock_checker: Optional[Callable[..., Awaitable[Any]]] = None,
    ):
        self.grading_config = grading_config or GradingConfig()
        self._eveng_checker = eveng_checker
        self._mock_checker = mock_checker
        self._context: Optional[ValidationContext] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run_preflight(
        self,
        ticket_id: str,
        lab_path: str,
        preflight_criteria: List[Dict[str, Any]],
        eveng_available: bool = False,
    ) -> PreflightResult:
        """
        Run pre-flight validation to verify the lab is in the correct
        initial broken state before the player starts troubleshooting.
        """
        criteria = [self._parse_criterion(c, i) for i, c in enumerate(preflight_criteria)]
        results = []

        for criterion in criteria:
            result = await self._execute_check(criterion)
            results.append(result)

        all_passed = all(r.passed for r in results)
        return PreflightResult(
            passed=all_passed,
            lab_correctly_broken=all_passed,
            checks=results,
            message="Pre-flight checks passed — lab is correctly broken" if all_passed
            else "Pre-flight checks failed — lab may not be in expected broken state",
        )

    async def validate(
        self,
        ticket_id: str,
        validation_criteria: List[Dict[str, Any]],
        context: Optional[ValidationContext] = None,
        script: Optional[Dict[str, Any]] = None,
    ) -> ValidationReport:
        """
        Run full validation pipeline for a ticket.

        Args:
            ticket_id: The ticket being validated
            validation_criteria: List of criteria definitions
            context: Validation context (mock CLI state, command history, etc.)
            script: Optional multi-step validation script definition
        """
        self._context = context or ValidationContext(
            ticket_id=ticket_id,
            lab_path="",
        )
        self._context.session_started_at = time.time() * 1000

        criteria = [self._parse_criterion(c, i) for i, c in enumerate(validation_criteria)]

        # Run anti-cheat detection
        anti_cheat_flags = await self._detect_anti_cheat(criteria)

        # If a script is provided, use it; otherwise run criteria directly
        if script:
            results = await self._execute_script(script, criteria)
        else:
            results = await self._execute_pipeline(criteria)

        # Build report
        report = self._build_report(ticket_id, results, anti_cheat_flags)

        # Apply anti-cheat penalty
        if anti_cheat_flags:
            report.score = max(0.0, report.score - 0.3)
            report.reward_multiplier = max(0.0, report.reward_multiplier - 0.3)
            if report.message:
                report.message += " (Anti-cheat penalty applied: skipping CLI troubleshooting)"

        return report

    async def validate_with_fallback(
        self,
        ticket_id: str,
        validation_criteria: List[Dict[str, Any]],
        mock_cli_state: Dict[str, Any],
        command_history: Optional[List[Dict[str, Any]]] = None,
    ) -> ValidationReport:
        """
        Validate a ticket using mock CLI state as fallback when EVE-NG is unavailable.
        """
        context = ValidationContext(
            ticket_id=ticket_id,
            lab_path="",
            mock_cli_state=mock_cli_state,
            eveng_available=False,
            command_history=command_history or [],
        )
        # Add a note about using mock fallback
        context.variables["_fallback_mode"] = True
        return await self.validate(ticket_id, validation_criteria, context)

    # ------------------------------------------------------------------
    # Pipeline execution
    # ------------------------------------------------------------------

    async def _execute_pipeline(self, criteria: List[ValidationCriterion]) -> List[CriterionResult]:
        """Execute all criteria in the pipeline, respecting convergence delays."""
        results = []
        for criterion in criteria:
            # Apply convergence delay if specified
            if criterion.convergence_delay_ms > 0:
                logger.debug(
                    f"Waiting {criterion.convergence_delay_ms}ms for convergence "
                    f"before checking criterion {criterion.criterion_id}"
                )
                await asyncio.sleep(criterion.convergence_delay_ms / 1000.0)

            result = await self._execute_check(criterion)
            results.append(result)

        return results

    async def _execute_script(
        self,
        script_def: Dict[str, Any],
        criteria: List[ValidationCriterion],
    ) -> List[CriterionResult]:
        """Execute a multi-step validation script."""
        results = []
        steps = script_def.get("steps", [])
        convergence_delay_ms = script_def.get("convergence_delay_ms", 0)

        # Build criteria map
        criteria_map = {c.criterion_id: c for c in criteria}

        for step_def in steps:
            criterion_id = step_def.get("criterion_id", "")
            delay_before = step_def.get("delay_before_ms", 0)
            retry_count = step_def.get("retry_count", 0)
            retry_delay = step_def.get("retry_delay_ms", 1000)

            criterion = criteria_map.get(criterion_id)
            if criterion is None:
                logger.warning(f"Script step references unknown criterion: {criterion_id}")
                continue

            # Apply delay before this step
            if delay_before > 0:
                await asyncio.sleep(delay_before / 1000.0)

            # Apply criterion's own convergence delay
            if criterion.convergence_delay_ms > 0:
                await asyncio.sleep(criterion.convergence_delay_ms / 1000.0)

            # Execute with retries
            result = await self._execute_with_retries(criterion, retry_count, retry_delay)
            results.append(result)

            # Apply script-level convergence delay between steps
            if convergence_delay_ms > 0 and len(results) < len(steps):
                await asyncio.sleep(convergence_delay_ms / 1000.0)

        return results

    async def _execute_with_retries(
        self,
        criterion: ValidationCriterion,
        retry_count: int,
        retry_delay_ms: int,
    ) -> CriterionResult:
        """Execute a criterion check with retries on failure."""
        result = await self._execute_check(criterion)

        for attempt in range(retry_count):
            if result.passed:
                break
            logger.debug(
                f"Retry {attempt + 1}/{retry_count} for criterion {criterion.criterion_id}"
            )
            await asyncio.sleep(retry_delay_ms / 1000.0)
            result = await self._execute_check(criterion)
            result.message += f" (retry {attempt + 1})"

        return result

    # ------------------------------------------------------------------
    # Individual check execution
    # ------------------------------------------------------------------

    async def _execute_check(self, criterion: ValidationCriterion) -> CriterionResult:
        """Execute a single validation criterion check."""
        start_time = time.time() * 1000

        try:
            if criterion.check_type == "ping":
                result = await self._check_ping(criterion)
            elif criterion.check_type == "command":
                result = await self._check_command(criterion)
            elif criterion.check_type == "config":
                result = await self._check_config(criterion)
            elif criterion.check_type == "api":
                result = await self._check_api(criterion)
            else:
                result = CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type=criterion.check_type,
                    status=CriterionStatus.ERROR,
                    passed=False,
                    message=f"Unknown check type: {criterion.check_type}",
                    hint="Internal validation error",
                    params=criterion.params,
                )
            # Store weight in result params for scoring
        except asyncio.TimeoutError:
            result = CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type=criterion.check_type,
                status=CriterionStatus.TIMED_OUT,
                passed=False,
                message=f"Check timed out",
                hint="The device may still be converging — try again in a moment",
                params=criterion.params,
            )
        except Exception as e:
            result = CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type=criterion.check_type,
                status=CriterionStatus.ERROR,
                passed=False,
                message=f"Check error: {str(e)}",
                hint="Internal validation error",
                params=criterion.params,
            )

        result.duration_ms = (time.time() * 1000) - start_time
        return result

    async def _check_ping(self, criterion: ValidationCriterion) -> CriterionResult:
        """Check ping connectivity."""
        params = criterion.params
        source = params.get("source", "unknown")
        destination = params.get("destination", "unknown")
        required_success_rate = params.get("successRate", params.get("success_rate", 100))
        count = params.get("count", 5)

        if self._context and self._context.mock_cli_state is not None:
            # Mock CLI fallback
            return await self._mock_ping_check(criterion, source, destination, required_success_rate, count)
        elif self._eveng_checker:
            # Real EVE-NG check
            return await self._eveng_ping_check(criterion, source, destination, required_success_rate, count)
        else:
            return CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type="ping",
                status=CriterionStatus.ERROR,
                passed=False,
                message=f"No validation backend available for ping check {source} -> {destination}",
                hint="Validation backend unavailable",
                expected=f"Ping {source} -> {destination} with {required_success_rate}% success",
                actual=None,
                params=params,
            )

    async def _check_command(self, criterion: ValidationCriterion) -> CriterionResult:
        """Check command output for expected content."""
        params = criterion.params
        node = params.get("node", "unknown")
        command = params.get("command", "")
        contains = params.get("contains", [])
        not_contains = params.get("notContains", [])
        exact_match = params.get("exactMatch")

        if self._context and self._context.mock_cli_state is not None:
            return await self._mock_command_check(criterion, node, command, contains, not_contains, exact_match)
        elif self._eveng_checker:
            return await self._eveng_command_check(criterion, node, command, contains, not_contains, exact_match)
        else:
            return CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type="command",
                status=CriterionStatus.ERROR,
                passed=False,
                message=f"No validation backend available for command check on {node}",
                hint="Validation backend unavailable",
                expected=f"Command '{command}' on {node} should contain {contains}",
                actual=None,
                params=params,
            )

    async def _check_config(self, criterion: ValidationCriterion) -> CriterionResult:
        """Check device configuration."""
        params = criterion.params
        node = params.get("node", "unknown")
        config_path = params.get("path", "")
        expected_value = params.get("value")
        contains = params.get("contains", [])
        not_contains = params.get("notContains", [])

        if self._context and self._context.mock_cli_state is not None:
            return await self._mock_config_check(
                criterion, node, config_path, expected_value, contains, not_contains
            )
        elif self._eveng_checker:
            return await self._eveng_config_check(
                criterion, node, config_path, expected_value, contains, not_contains
            )
        else:
            return CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type="config",
                status=CriterionStatus.ERROR,
                passed=False,
                message=f"No validation backend available for config check on {node}",
                hint="Validation backend unavailable",
                expected=f"Config on {node} should have {config_path}={expected_value}",
                actual=None,
                params=params,
            )

    async def _check_api(self, criterion: ValidationCriterion) -> CriterionResult:
        """Check an API endpoint for expected response."""
        params = criterion.params
        url = params.get("url", "")
        method = params.get("method", "GET")
        expected_status = params.get("expectedStatus", 200)
        expected_body_contains = params.get("expectedBodyContains")
        headers = params.get("headers", {})

        if self._eveng_checker:
            # Can use EVE-NG API or other API
            return await self._eveng_api_check(
                criterion, url, method, expected_status, expected_body_contains, headers
            )
        elif self._context and self._context.mock_cli_state is not None:
            # Mock API check
            return await self._mock_api_check(
                criterion, url, method, expected_status, expected_body_contains
            )
        else:
            return CriterionResult(
                criterion_id=criterion.criterion_id,
                check_type="api",
                status=CriterionStatus.ERROR,
                passed=False,
                message=f"No validation backend available for API check: {method} {url}",
                hint="Validation backend unavailable",
                expected=f"{method} {url} -> {expected_status}",
                actual=None,
                params=params,
            )

    # ------------------------------------------------------------------
    # Mock CLI fallback checks
    # ------------------------------------------------------------------

    async def _mock_ping_check(
        self, criterion: ValidationCriterion, source: str, destination: str,
        required_success_rate: int, count: int
    ) -> CriterionResult:
        """Simulate ping check using mock CLI state."""
        mock_state = self._context.mock_cli_state or {}
        # Check if destination appears reachable in mock state
        routing = mock_state.get("routing", {})
        interfaces = mock_state.get("interfaces", {})

        # Simple heuristic: check if destination network exists in routing table
        reachable = False
        for route in routing.get("routes", []):
            if route.get("destination") == destination or destination in route.get("network", ""):
                reachable = route.get("status") == "up" or route.get("nextHop") is not None

        # Also check interface state
        if not reachable:
            for iface_name, iface in interfaces.items():
                if iface.get("status") == "up" and iface.get("ip"):
                    reachable = True
                    break

        passed = reachable and required_success_rate <= 100

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="ping",
            status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
            passed=passed,
            message=f"Ping {source} -> {destination}: {'SUCCESS' if passed else 'FAILED'}",
            hint=criterion.hint_on_fail if not passed else "",
            expected=f"{required_success_rate}% success rate",
            actual="Destination reachable" if reachable else "Destination unreachable",
            params=criterion.params,
        )

    async def _mock_command_check(
        self, criterion: ValidationCriterion, node: str, command: str,
        contains: List[str], not_contains: List[str], exact_match: Optional[str]
    ) -> CriterionResult:
        """Check command output in mock CLI state."""
        mock_state = self._context.mock_cli_state or {}
        device_state = mock_state.get(node, mock_state)

        # Try to get command output from virtual filesystem
        output = ""
        vfs = device_state.get("filesystem", {})
        if command in vfs:
            output = vfs[command]

        # Check contains
        all_contained = all(c in output for c in contains) if contains else True
        none_contained = not any(nc in output for nc in not_contains) if not_contains else True
        exact_ok = output.strip() == exact_match.strip() if exact_match is not None else True

        passed = all_contained and none_contained and exact_ok

        failures = []
        if not all_contained:
            missing = [c for c in contains if c not in output]
            failures.append(f"Missing: {missing}")
        if not none_contained:
            found = [nc for nc in not_contains if nc in output]
            failures.append(f"Found forbidden: {found}")
        if not exact_ok:
            failures.append("Output does not match expected")

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="command",
            status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
            passed=passed,
            message=f"Command '{command}' on {node}: {'OK' if passed else 'FAILED'}",
            hint=criterion.hint_on_fail if not passed else "",
            expected=f"Output should contain {contains}" + (f" and not contain {not_contains}" if not_contains else ""),
            actual=output[:200] if output else "(no output)",
            params=criterion.params,
        )

    async def _mock_config_check(
        self, criterion: ValidationCriterion, node: str, config_path: str,
        expected_value: Any, contains: List[str], not_contains: List[str],
    ) -> CriterionResult:
        """Check device config in mock CLI state."""
        mock_state = self._context.mock_cli_state or {}
        device_state = mock_state.get(node, mock_state)

        # Navigate config path
        config = device_state.get("config", device_state)
        for key in config_path.split("."):
            if isinstance(config, dict):
                config = config.get(key, {})
            else:
                config = {}

        value_ok = True
        if expected_value is not None:
            value_ok = config == expected_value

        contains_ok = True
        if contains and isinstance(config, str):
            contains_ok = all(c in config for c in contains)

        not_contains_ok = True
        if not_contains and isinstance(config, str):
            not_contains_ok = not any(nc in config for nc in not_contains)

        passed = value_ok and contains_ok and not_contains_ok

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="config",
            status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
            passed=passed,
            message=f"Config check {config_path} on {node}: {'OK' if passed else 'FAILED'}",
            hint=criterion.hint_on_fail if not passed else "",
            expected=expected_value,
            actual=config,
            params=criterion.params,
        )

    async def _mock_api_check(
        self, criterion: ValidationCriterion, url: str, method: str,
        expected_status: int, expected_body_contains: Optional[str],
    ) -> CriterionResult:
        """Check mock API response."""
        mock_state = self._context.mock_cli_state or {}
        api_responses = mock_state.get("api_responses", {})

        response = api_responses.get(f"{method}:{url}", {})
        status_ok = response.get("status", 0) == expected_status
        body_ok = True
        if expected_body_contains:
            body = response.get("body", "")
            body_ok = expected_body_contains in str(body)

        passed = status_ok and body_ok

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="api",
            status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
            passed=passed,
            message=f"API {method} {url}: {'OK' if passed else 'FAILED'}",
            hint=criterion.hint_on_fail if not passed else "",
            expected=f"Status {expected_status}" + (f", body contains '{expected_body_contains}'" if expected_body_contains else ""),
            actual=f"Status {response.get('status')}, body: {str(response.get('body', ''))[:100]}",
            params=criterion.params,
        )

    # ------------------------------------------------------------------
    # EVE-NG checks (stubs — delegate to actual EVE-NG client)
    # ------------------------------------------------------------------

    async def _eveng_ping_check(
        self, criterion, source: str, destination: str,
        required_success_rate: int, count: int,
    ) -> CriterionResult:
        """Real EVE-NG ping check via the EVE-NG client."""
        if self._eveng_checker:
            try:
                result = await self._eveng_checker("ping", {
                    "source": source,
                    "destination": destination,
                    "count": count,
                })
                success_rate = result.get("success_rate", 0)
                passed = success_rate >= required_success_rate

                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="ping",
                    status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
                    passed=passed,
                    message=f"Ping {source} -> {destination}: {success_rate}% success (required {required_success_rate}%)",
                    hint=criterion.hint_on_fail if not passed else "",
                    expected=f"{required_success_rate}%",
                    actual=f"{success_rate}%",
                    params=criterion.params,
                )
            except Exception as e:
                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="ping",
                    status=CriterionStatus.ERROR,
                    passed=False,
                    message=f"EVE-NG ping error: {e}",
                    hint="EVE-NG may be unavailable — try mock CLI fallback",
                    params=criterion.params,
                )

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="ping",
            status=CriterionStatus.ERROR,
            passed=False,
            message="EVE-NG checker not configured",
            hint="EVE-NG validation backend unavailable",
            params=criterion.params,
        )

    async def _eveng_command_check(self, criterion, node, command, contains, not_contains, exact_match):
        """Real EVE-NG command check."""
        if self._eveng_checker:
            try:
                result = await self._eveng_checker("command", {
                    "node": node,
                    "command": command,
                })
                output = result.get("output", "")
                all_contained = all(c in output for c in contains) if contains else True
                none_contained = not any(nc in output for nc in not_contains) if not_contains else True
                exact_ok = output.strip() == exact_match.strip() if exact_match is not None else True

                passed = all_contained and none_contained and exact_ok

                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="command",
                    status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
                    passed=passed,
                    message=f"Command '{command}' on {node}: {'OK' if passed else 'FAILED'}",
                    hint=criterion.hint_on_fail if not passed else "",
                    expected=f"Should contain {contains}",
                    actual=output[:200] if output else "(no output)",
                    params=criterion.params,
                )
            except Exception as e:
                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="command",
                    status=CriterionStatus.ERROR,
                    passed=False,
                    message=f"EVE-NG command error: {e}",
                    hint="EVE-NG may be unavailable — try mock CLI fallback",
                    params=criterion.params,
                )

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="command",
            status=CriterionStatus.ERROR,
            passed=False,
            message="EVE-NG checker not configured",
            hint="EVE-NG validation backend unavailable",
            params=criterion.params,
        )

    async def _eveng_config_check(self, criterion, node, config_path, expected_value, contains, not_contains):
        """Real EVE-NG config check."""
        if self._eveng_checker:
            try:
                result = await self._eveng_checker("config", {
                    "node": node,
                    "path": config_path,
                })
                actual = result.get("value")
                passed = (expected_value is None or actual == expected_value)

                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="config",
                    status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
                    passed=passed,
                    message=f"Config check {config_path} on {node}: {'OK' if passed else 'FAILED'}",
                    hint=criterion.hint_on_fail if not passed else "",
                    expected=expected_value,
                    actual=actual,
                    params=criterion.params,
                )
            except Exception as e:
                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="config",
                    status=CriterionStatus.ERROR,
                    passed=False,
                    message=f"EVE-NG config error: {e}",
                    hint="EVE-NG may be unavailable — try mock CLI fallback",
                    params=criterion.params,
                )

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="config",
            status=CriterionStatus.ERROR,
            passed=False,
            message="EVE-NG checker not configured",
            hint="EVE-NG validation backend unavailable",
            params=criterion.params,
        )

    async def _eveng_api_check(
        self, criterion, url, method, expected_status, expected_body_contains, headers
    ):
        """Real API check via EVE-NG or external API."""
        if self._eveng_checker:
            try:
                result = await self._eveng_checker("api", {
                    "url": url,
                    "method": method,
                    "headers": headers,
                })
                actual_status = result.get("status", 0)
                body = result.get("body", "")
                status_ok = actual_status == expected_status
                body_ok = expected_body_contains is None or expected_body_contains in str(body)
                passed = status_ok and body_ok

                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="api",
                    status=CriterionStatus.PASS if passed else CriterionStatus.FAIL,
                    passed=passed,
                    message=f"API {method} {url}: {'OK' if passed else 'FAILED'}",
                    hint=criterion.hint_on_fail if not passed else "",
                    expected=f"Status {expected_status}",
                    actual=f"Status {actual_status}",
                    params=criterion.params,
                )
            except Exception as e:
                return CriterionResult(
                    criterion_id=criterion.criterion_id,
                    check_type="api",
                    status=CriterionStatus.ERROR,
                    passed=False,
                    message=f"API check error: {e}",
                    hint="API endpoint may be unavailable",
                    params=criterion.params,
                )

        return CriterionResult(
            criterion_id=criterion.criterion_id,
            check_type="api",
            status=CriterionStatus.ERROR,
            passed=False,
            message="API checker not configured",
            hint="API validation backend unavailable",
            params=criterion.params,
        )

    # ------------------------------------------------------------------
    # Anti-cheat detection
    # ------------------------------------------------------------------

    async def _detect_anti_cheat(self, criteria: List[ValidationCriterion]) -> List[str]:
        """Detect if the player bypassed CLI troubleshooting."""
        flags = []
        if not self._context:
            return flags

        anti_cheat_criteria = [c for c in criteria if c.anti_cheat]
        command_history = self._context.command_history

        for criterion in anti_cheat_criteria:
            # Check if player executed any troubleshooting commands
            # If they reached the fix without using CLI, flag it
            if not command_history or len(command_history) == 0:
                flags.append(f"No CLI commands executed for criterion: {criterion.criterion_id}")
            else:
                # Check if required diagnostic commands were run
                required_commands = criterion.params.get("requiredCommands", [])
                if required_commands:
                    executed_commands = {cmd.get("command", "").strip() for cmd in command_history}
                    missing = [rc for rc in required_commands if rc not in executed_commands]
                    if missing:
                        flags.append(
                            f"Missing required diagnostic commands for {criterion.criterion_id}: {missing}"
                        )

        return flags

    # ------------------------------------------------------------------
    # Report building
    # ------------------------------------------------------------------

    def _build_report(
        self,
        ticket_id: str,
        results: List[CriterionResult],
        anti_cheat_flags: List[str],
    ) -> ValidationReport:
        """Build a validation report from criterion results."""
        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed

        # Calculate score (weighted)
        total_weight = sum(r.params.get("_weight", 1.0) for r in results) if results else 1.0
        if results and total_weight > 0:
            earned_weight = sum(
                r.params.get("_weight", 1.0) for r in results if r.passed
            )
            score = earned_weight / total_weight
        else:
            score = 1.0 if not results else 0.0

        # Determine outcome
        if score >= self.grading_config.full_pass_threshold:
            outcome = ValidationOutcome.FULL_PASS
            success = True
        elif score >= self.grading_config.partial_pass_threshold:
            outcome = ValidationOutcome.PARTIAL_PASS
            success = True
        else:
            outcome = ValidationOutcome.FULL_FAIL
            success = False

        # Determine reward multiplier
        reward_multiplier = self._calculate_reward_multiplier(score)

        # Build hints for failed criteria
        hints = [r.hint for r in results if not r.passed and r.hint]

        # Build summary message
        if outcome == ValidationOutcome.FULL_PASS:
            message = f"All {total} criteria passed — full reward!"
        elif outcome == ValidationOutcome.PARTIAL_PASS:
            message = (
                f"{passed}/{total} criteria passed ({score:.0%}) — "
                f"partial reward at {reward_multiplier:.0%}"
            )
        else:
            message = f"Only {passed}/{total} criteria passed ({score:.0%}) — no reward"

        total_duration = sum(r.duration_ms for r in results)

        return ValidationReport(
            ticket_id=ticket_id,
            outcome=outcome,
            success=success,
            total_criteria=total,
            passed_criteria=passed,
            failed_criteria=failed,
            score=score,
            reward_multiplier=reward_multiplier,
            criteria_results=results,
            anti_cheat_flags=anti_cheat_flags,
            total_duration_ms=total_duration,
            message=message,
            hints=hints,
        )

    def _calculate_reward_multiplier(self, score: float) -> float:
        """Calculate reward multiplier based on score and grading config."""
        if self.grading_config.reward_scaling == "stepped":
            for step in self.grading_config.reward_steps:
                if score >= step["threshold"]:
                    return step["multiplier"]
            return self.grading_config.partial_reward_floor

        # Linear scaling
        if score >= self.grading_config.full_pass_threshold:
            return 1.0
        if score < self.grading_config.partial_pass_threshold:
            return 0.0

        # Linear interpolation between partial_pass_threshold and full_pass_threshold
        normalized = (
            (score - self.grading_config.partial_pass_threshold)
            / (self.grading_config.full_pass_threshold - self.grading_config.partial_pass_threshold)
        )
        return self.grading_config.partial_reward_floor + normalized * (1.0 - self.grading_config.partial_reward_floor)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_criterion(self, raw: Dict[str, Any], index: int = 0) -> ValidationCriterion:
        """Parse a raw criterion dict into a ValidationCriterion."""
        check_type_str = raw.get("type", "command")

        # Use provided id, or auto-generate sequential id for script references
        criterion_id = raw.get("id", raw.get("criterion_id", None))
        if criterion_id is None:
            criterion_id = f"criterion_{index}"

        criterion = ValidationCriterion(
            criterion_id=criterion_id,
            check_type=check_type_str,  # store as string to preserve unknown types
            params=raw.get("params", raw),
            weight=raw.get("weight", 1.0),
            required=raw.get("required", True),
            convergence_delay_ms=raw.get("convergenceDelayMs", raw.get("convergence_delay_ms", 0)),
            hint_on_fail=raw.get("hintOnFail", raw.get("hint", "")),
            anti_cheat=raw.get("antiCheat", raw.get("anti_cheat", False)),
        )
        # Store weight in params for downstream scoring
        criterion.params["_weight"] = criterion.weight
        return criterion


# ============================================================================
# Singleton
# ============================================================================

validation_engine = ValidationEngine()
