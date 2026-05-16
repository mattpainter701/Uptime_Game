"""
Tests for Validation Engine v2

Covers:
- All four check types (ping, command, config, api)
- Partial-success grading (linear and stepped)
- Validation timing / convergence delays
- Multi-step validation scripts
- Pre-flight validation
- Mock CLI fallback
- Anti-cheat detection
- Error and timeout handling
- Report building
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.validation_engine import (
    ValidationEngine,
    ValidationContext,
    ValidationCriterion,
    ValidationScript,
    ValidationStep,
    CriterionStatus,
    ValidationOutcome,
    GradingConfig,
    CriterionResult,
    PreflightResult,
    ValidationReport,
)


# ============================================================================
# Helpers
# ============================================================================

def make_criterion(
    criterion_id="c1",
    check_type="ping",
    params=None,
    weight=1.0,
    required=True,
    convergence_delay_ms=0,
    hint_on_fail="",
    anti_cheat=False,
):
    return ValidationCriterion(
        criterion_id=criterion_id,
        check_type=check_type,
        params=params or {},
        weight=weight,
        required=required,
        convergence_delay_ms=convergence_delay_ms,
        hint_on_fail=hint_on_fail,
        anti_cheat=anti_cheat,
    )


# ============================================================================
# Mock CLI fallback tests
# ============================================================================

class TestMockCliFallback:
    """Test validation using mock CLI state fallback."""

    @pytest.mark.asyncio
    async def test_ping_reachable(self):
        """Ping check passes when destination is reachable in mock state."""
        engine = ValidationEngine()
        mock_state = {
            "routing": {
                "routes": [
                    {"destination": "10.0.1.1", "network": "10.0.1.0/24", "status": "up", "nextHop": "10.0.0.1"}
                ]
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{"type": "ping", "params": {"source": "R1", "destination": "10.0.1.1", "successRate": 100}}]
        report = await engine.validate("t1", criteria, context)

        assert report.success
        assert report.passed_criteria == 1
        assert report.failed_criteria == 0
        assert report.score == 1.0
        assert report.outcome == ValidationOutcome.FULL_PASS

    @pytest.mark.asyncio
    async def test_ping_unreachable(self):
        """Ping check fails when destination is unreachable."""
        engine = ValidationEngine()
        mock_state = {
            "routing": {"routes": []},
            "interfaces": {}
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{"type": "ping", "params": {"source": "R1", "destination": "10.0.1.1", "successRate": 100}}]
        report = await engine.validate("t1", criteria, context)

        assert not report.success
        assert report.passed_criteria == 0
        assert report.failed_criteria == 1
        assert report.outcome == ValidationOutcome.FULL_FAIL

    @pytest.mark.asyncio
    async def test_command_contains(self):
        """Command check passes when output contains expected strings."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1\n10.0.0.0/24 directly connected"
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "command",
            "params": {
                "node": "R1",
                "command": "show ip route",
                "contains": ["0.0.0.0/0", "203.0.113.1"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert report.success
        assert report.passed_criteria == 1

    @pytest.mark.asyncio
    async def test_command_missing_content(self):
        """Command check fails when output doesn't contain expected strings."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "10.0.0.0/24 directly connected"
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "command",
            "params": {
                "node": "R1",
                "command": "show ip route",
                "contains": ["0.0.0.0/0"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert not report.success
        assert report.failed_criteria == 1
        # Should have a hint about missing content
        assert len(report.criteria_results[0].message) > 0

    @pytest.mark.asyncio
    async def test_config_check(self):
        """Config check passes when expected value matches."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "config": {
                    "hostname": "R1",
                    "interfaces": {
                        "GigabitEthernet0/1": {
                            "ip": "203.0.113.2",
                            "status": "up"
                        }
                    }
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "config",
            "params": {
                "node": "R1",
                "path": "interfaces.GigabitEthernet0/1.ip",
                "value": "203.0.113.2"
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert report.success
        assert report.passed_criteria == 1

    @pytest.mark.asyncio
    async def test_api_check(self):
        """API check passes when mock response matches expected."""
        engine = ValidationEngine()
        mock_state = {
            "api_responses": {
                "GET:/api/nodes": {"status": 200, "body": {"nodes": [{"id": 1}]}}
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "api",
            "params": {
                "url": "/api/nodes",
                "method": "GET",
                "expectedStatus": 200
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert report.success
        assert report.passed_criteria == 1


# ============================================================================
# Partial-success grading tests
# ============================================================================

class TestPartialSuccessGrading:
    """Test partial-success grading and reward calculation."""

    @pytest.mark.asyncio
    async def test_full_pass_hundred_percent(self):
        """All criteria pass = full reward."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [
            {"type": "command", "params": {"node": "R1", "command": "show ip route", "contains": ["0.0.0.0/0"]}},
            {"type": "command", "params": {"node": "R1", "command": "show ip route", "contains": ["203.0.113.1"]}},
        ]
        report = await engine.validate("t1", criteria, context)

        assert report.outcome == ValidationOutcome.FULL_PASS
        assert report.score == 1.0
        assert report.reward_multiplier == 1.0
        assert report.passed_criteria == 2

    @pytest.mark.asyncio
    async def test_partial_pass_50_percent(self):
        """50% criteria pass = partial pass."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "10.0.0.0/24 directly connected",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [
            {"type": "command", "params": {"node": "R1", "command": "show ip route", "contains": ["10.0.0.0"]}},
            {"type": "command", "params": {"node": "R1", "command": "show ip route", "contains": ["MISSING_ROUTE"]}},
        ]
        report = await engine.validate("t1", criteria, context)

        assert report.outcome == ValidationOutcome.FULL_FAIL  # 50% is below 60% threshold
        assert report.score == 0.5
        assert report.passed_criteria == 1
        assert report.failed_criteria == 1

    @pytest.mark.asyncio
    async def test_partial_pass_above_threshold(self):
        """75% criteria pass = partial pass with linear reward."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ver": "Cisco IOS 15.2",
                    "show run": "hostname R1",
                    "show ip int br": "Gi0/1 up up",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [
            {"type": "command", "params": {"node": "R1", "command": "show ver", "contains": ["Cisco"]}},
            {"type": "command", "params": {"node": "R1", "command": "show run", "contains": ["hostname"]}},
            {"type": "command", "params": {"node": "R1", "command": "show ip int br", "contains": ["Gi0/1"]}},
            {"type": "command", "params": {"node": "R1", "command": "show ip route", "contains": ["MISSING"]}},
        ]
        report = await engine.validate("t1", criteria, context)

        assert report.outcome == ValidationOutcome.PARTIAL_PASS
        assert report.score == 0.75
        assert report.success  # partial pass is still success
        assert 0.3 <= report.reward_multiplier <= 1.0  # linear scaling

    @pytest.mark.asyncio
    async def test_stepped_reward_scaling(self):
        """Stepped reward scaling gives discrete reward tiers."""
        config = GradingConfig(
            reward_scaling="stepped",
            reward_steps=[
                {"threshold": 1.0, "multiplier": 1.0},
                {"threshold": 0.8, "multiplier": 0.7},
                {"threshold": 0.6, "multiplier": 0.4},
                {"threshold": 0.0, "multiplier": 0.0},
            ],
        )
        engine = ValidationEngine(grading_config=config)

        # 80% score should get 0.7 multiplier
        assert engine._calculate_reward_multiplier(0.8) == 0.7
        # 100% score should get 1.0 multiplier
        assert engine._calculate_reward_multiplier(1.0) == 1.0
        # 65% score should get 0.4 multiplier
        assert engine._calculate_reward_multiplier(0.65) == 0.4
        # 55% score should get 0.0 (below lowest non-zero step at 0.6)
        assert engine._calculate_reward_multiplier(0.55) == 0.0

    @pytest.mark.asyncio
    async def test_weighted_scoring(self):
        """Weighted criteria affect score proportionally."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ver": "Cisco IOS",
                    "show run": "config here",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        # Weighted: first criterion has weight 3, second has weight 1
        criteria = [
            {"type": "command", "weight": 3.0, "params": {"node": "R1", "command": "show ver", "contains": ["Cisco"]}},
            {"type": "command", "weight": 1.0, "params": {"node": "R1", "command": "show run", "contains": ["MISSING"]}},
        ]
        report = await engine.validate("t1", criteria, context)

        # Only first criterion passes, weight 3 out of 4 = 0.75
        assert report.score == 0.75
        assert report.passed_criteria == 1
        assert report.failed_criteria == 1


# ============================================================================
# Validation timing and convergence tests
# ============================================================================

class TestValidationTiming:
    """Test convergence delays and validation timing."""

    @pytest.mark.asyncio
    async def test_convergence_delay(self):
        """Criteria with convergence_delay_ms wait before checking."""
        engine = ValidationEngine()

        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip ospf neighbor": "Neighbor 10.1.1.2 FULL"
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "command",
            "convergenceDelayMs": 100,
            "params": {
                "node": "R1",
                "command": "show ip ospf neighbor",
                "contains": ["FULL"]
            }
        }]

        import time
        start = time.time()
        report = await engine.validate("t1", criteria, context)
        elapsed = (time.time() - start) * 1000

        assert report.success
        assert elapsed >= 80  # should have waited at least ~100ms (allow some tolerance)


class TestValidationScripts:
    """Test multi-step validation scripts."""

    @pytest.mark.asyncio
    async def test_multi_step_script(self):
        """Multi-step script executes steps in order."""
        engine = ValidationEngine()

        mock_state = {
            "R1": {
                "filesystem": {
                    "show ver": "Cisco IOS",
                    "show run": "hostname R1\ninterface Gi0/1\n ip address 10.0.0.1 255.255.255.0",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [
            {"type": "command", "params": {"node": "R1", "command": "show ver", "contains": ["Cisco"]}},
            {"type": "command", "params": {"node": "R1", "command": "show run", "contains": ["10.0.0.1"]}},
        ]
        script = {
            "steps": [
                {"criterion_id": "criterion_0", "delay_before_ms": 0},
                {"criterion_id": "criterion_1", "delay_before_ms": 50},
            ]
        }

        import time
        start = time.time()
        report = await engine.validate("t1", criteria, context, script)
        elapsed = (time.time() - start) * 1000

        assert report.success
        assert report.passed_criteria == 2
        assert elapsed >= 30  # should have waited at least 50ms

    @pytest.mark.asyncio
    async def test_script_with_retries(self):
        """Script step with retries eventually passes."""
        engine = ValidationEngine()

        # First command will fail, second will pass (simulating convergence)
        call_count = [0]
        mock_state = {
            "R1": {
                "filesystem": {},
            }
        }

        # Override the command check to simulate retry behavior
        original_check = engine._mock_command_check
        async def retry_mock(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] <= 2:
                return CriterionResult(
                    criterion_id="c1", check_type="command",
                    status=CriterionStatus.FAIL, passed=False,
                    message="Not ready yet",
                    hint="Wait for convergence",
                    params={}
                )
            return CriterionResult(
                criterion_id="c1", check_type="command",
                status=CriterionStatus.PASS, passed=True,
                message="Now ready",
                params={}
            )
        engine._mock_command_check = retry_mock

        try:
            criteria = [
                {"type": "command", "params": {"node": "R1", "command": "show ip ospf neighbor", "contains": ["FULL"]}},
            ]
            script = {
                "steps": [
                    {"criterion_id": "criterion_0", "retry_count": 3, "retry_delay_ms": 10},
                ]
            }
            context = ValidationContext(
                ticket_id="t1", lab_path="", mock_cli_state=mock_state
            )
            report = await engine.validate("t1", criteria, context, script)

            assert report.success
            assert call_count[0] >= 3  # at least one initial + retries
        finally:
            engine._mock_command_check = original_check


# ============================================================================
# Pre-flight validation tests
# ============================================================================

class TestPreflightValidation:
    """Test pre-flight validation."""

    @pytest.mark.asyncio
    async def test_preflight_all_pass(self):
        """Pre-flight checks all pass."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show run": "interface Gi0/1\n shutdown",
                }
            }
        }

        # Override run_preflight to use mock context
        async def mock_run_preflight(*args, **kwargs):
            # Simulate pre-flight using mock CLI
            preflight_criteria = kwargs.get("preflight_criteria", args[3] if len(args) > 3 else [])
            results = []
            for c in preflight_criteria:
                parsed = engine._parse_criterion(c)
                result = await engine._mock_command_check(
                    parsed, parsed.params.get("node", ""), parsed.params.get("command", ""),
                    parsed.params.get("contains", []), parsed.params.get("notContains", []), None
                )
                results.append(result)
            return PreflightResult(
                passed=all(r.passed for r in results),
                lab_correctly_broken=all(r.passed for r in results),
                checks=results,
                message="OK" if all(r.passed for r in results) else "FAIL"
            )

        # Direct test of preflight
        result = await engine.run_preflight(
            "t1", "/labs/test",
            [{"type": "command", "params": {"node": "R1", "command": "show run", "contains": ["shutdown"]}}]
        )

        # Without mock state this will be an error since no backend
        # Let's test with mock state set
        engine._context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )
        result = await engine.run_preflight(
            "t1", "/labs/test",
            [{"type": "command", "params": {"node": "R1", "command": "show run", "contains": ["shutdown"]}}]
        )

        assert result.passed
        assert result.lab_correctly_broken


# ============================================================================
# Anti-cheat detection tests
# ============================================================================

class TestAntiCheatDetection:
    """Test anti-cheat detection."""

    @pytest.mark.asyncio
    async def test_no_commands_executed(self):
        """Flag when player has no CLI command history."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state,
            command_history=[],  # empty!
        )

        criteria = [{
            "type": "command",
            "antiCheat": True,
            "params": {
                "node": "R1", "command": "show ip route",
                "contains": ["0.0.0.0/0"],
                "requiredCommands": ["show ip route"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert len(report.anti_cheat_flags) > 0
        assert "No CLI commands executed" in report.anti_cheat_flags[0]

    @pytest.mark.asyncio
    async def test_missing_required_diagnostic_commands(self):
        """Flag when required diagnostic commands not run."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state,
            command_history=[
                {"command": "ping 8.8.8.8", "timestamp": 1000},
                # Missing: "show ip route" which is required!
            ]
        )

        criteria = [{
            "type": "command",
            "antiCheat": True,
            "params": {
                "node": "R1", "command": "show ip route",
                "contains": ["0.0.0.0/0"],
                "requiredCommands": ["show ip route"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert len(report.anti_cheat_flags) > 0
        assert "Missing required diagnostic commands" in report.anti_cheat_flags[0]

    @pytest.mark.asyncio
    async def test_no_anti_cheat_with_commands(self):
        """No flag when player ran required commands."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state,
            command_history=[
                {"command": "show ip route", "timestamp": 1000},
            ]
        )

        criteria = [{
            "type": "command",
            "antiCheat": True,
            "params": {
                "node": "R1", "command": "show ip route",
                "contains": ["0.0.0.0/0"],
                "requiredCommands": ["show ip route"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert len(report.anti_cheat_flags) == 0

    @pytest.mark.asyncio
    async def test_anti_cheat_penalty_reduces_reward(self):
        """Anti-cheat flag reduces score and reward."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ip route": "0.0.0.0/0 via 203.0.113.1",
                }
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state,
            command_history=[],  # no commands = cheat flag
        )

        criteria = [{
            "type": "command",
            "antiCheat": True,
            "params": {
                "node": "R1", "command": "show ip route",
                "contains": ["0.0.0.0/0"],
                "requiredCommands": ["show ip route"]
            }
        }]
        report = await engine.validate("t1", criteria, context)

        assert len(report.anti_cheat_flags) > 0
        assert report.score < 1.0  # penalized
        assert report.reward_multiplier < 1.0  # penalized


# ============================================================================
# Report building tests
# ============================================================================

class TestReportBuilding:
    """Test validation report structure and content."""

    @pytest.mark.asyncio
    async def test_report_contains_all_fields(self):
        """Report has all expected fields."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {"show ver": "Cisco IOS"}
            }
        }
        context = ValidationContext(
            ticket_id="ticket-123", lab_path="", mock_cli_state=mock_state
        )
        criteria = [
            {"type": "command", "params": {"node": "R1", "command": "show ver", "contains": ["Cisco"]}},
        ]
        report = await engine.validate("ticket-123", criteria, context)

        assert report.ticket_id == "ticket-123"
        assert report.total_criteria == 1
        assert report.score is not None
        assert report.reward_multiplier is not None
        assert report.message
        assert len(report.criteria_results) == 1

        cr = report.criteria_results[0]
        assert cr.criterion_id
        assert cr.check_type
        assert cr.status
        assert cr.passed is not None
        assert cr.duration_ms >= 0

    @pytest.mark.asyncio
    async def test_failed_criteria_include_hints(self):
        """Failed criteria include hint text."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {"show run": "no relevant config"}
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "command",
            "hintOnFail": "Check the default route with 'show ip route'",
            "params": {"node": "R1", "command": "show run", "contains": ["MISSING"]},
        }]
        report = await engine.validate("t1", criteria, context)

        assert not report.success
        assert len(report.hints) > 0
        assert "default route" in report.hints[0]

    @pytest.mark.asyncio
    async def test_not_contains_check(self):
        """notContains check flags forbidden content."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {"show run": "interface Gi0/1\n shutdown"}
            }
        }
        context = ValidationContext(
            ticket_id="t1", lab_path="", mock_cli_state=mock_state
        )

        criteria = [{
            "type": "command",
            "params": {
                "node": "R1", "command": "show run",
                "notContains": ["shutdown"]
            },
        }]
        report = await engine.validate("t1", criteria, context)

        assert not report.success  # shutdown IS in the output, so it fails
        assert report.failed_criteria == 1


# ============================================================================
# Edge cases and error handling
# ============================================================================

class TestEdgeCases:
    """Edge case and error handling tests."""

    @pytest.mark.asyncio
    async def test_empty_criteria(self):
        """No criteria = full pass with 100%."""
        engine = ValidationEngine()
        context = ValidationContext(ticket_id="t1", lab_path="")
        report = await engine.validate("t1", [], context)

        assert report.success
        assert report.total_criteria == 0
        assert report.score == 1.0  # no criteria = automatic full pass
        assert report.outcome == ValidationOutcome.FULL_PASS

    @pytest.mark.asyncio
    async def test_unknown_check_type(self):
        """Unknown check type returns error result."""
        engine = ValidationEngine()
        context = ValidationContext(ticket_id="t1", lab_path="")

        criteria = [{"type": "unknown_type", "params": {}}]
        report = await engine.validate("t1", criteria, context)

        assert not report.success
        cr = report.criteria_results[0]
        assert cr.status == CriterionStatus.ERROR
        assert "Unknown check type" in cr.message

    @pytest.mark.asyncio
    async def test_no_backend(self):
        """No mock state and no EVE-NG = error results."""
        engine = ValidationEngine()
        context = ValidationContext(ticket_id="t1", lab_path="")

        criteria = [{"type": "ping", "params": {"source": "R1", "destination": "10.0.0.1"}}]
        report = await engine.validate("t1", criteria, context)

        cr = report.criteria_results[0]
        assert cr.status == CriterionStatus.ERROR
        assert "No validation backend" in cr.message

    @pytest.mark.asyncio
    async def test_convergence_delay_ordering(self):
        """Multiple criteria with delays execute in order with correct timing."""
        engine = ValidationEngine()
        mock_state = {
            "R1": {
                "filesystem": {
                    "show ver": "Cisco",
                    "show run": "config",
                }
            }
        }
        context = ValidationContext(ticket_id="t1", lab_path="", mock_cli_state=mock_state)

        criteria = [
            {"type": "command", "convergenceDelayMs": 50, "params": {"node": "R1", "command": "show ver", "contains": ["Cisco"]}},
            {"type": "command", "convergenceDelayMs": 50, "params": {"node": "R1", "command": "show run", "contains": ["config"]}},
        ]

        import time
        start = time.time()
        report = await engine.validate("t1", criteria, context)
        elapsed = (time.time() - start) * 1000

        assert report.success
        assert report.passed_criteria == 2
        assert elapsed >= 80  # at least two 50ms delays


# ============================================================================
# GradingConfig tests
# ============================================================================

class TestGradingConfig:
    """Test grading configuration."""

    def test_default_config(self):
        config = GradingConfig()
        assert config.full_pass_threshold == 1.0
        assert config.partial_pass_threshold == 0.6
        assert config.partial_reward_floor == 0.3
        assert config.reward_scaling == "linear"

    def test_linear_reward_below_threshold(self):
        engine = ValidationEngine()
        assert engine._calculate_reward_multiplier(0.3) == 0.0  # below 0.6 = no reward
        assert engine._calculate_reward_multiplier(0.0) == 0.0

    def test_linear_reward_full_pass(self):
        engine = ValidationEngine()
        assert engine._calculate_reward_multiplier(1.0) == 1.0

    def test_linear_reward_partial(self):
        engine = ValidationEngine()
        # 80% score should give reward between floor (0.3) and 1.0
        mult = engine._calculate_reward_multiplier(0.8)
        assert 0.3 < mult < 1.0


# ============================================================================
# ValidationContext tests
# ============================================================================

class TestValidationContext:
    def test_context_defaults(self):
        ctx = ValidationContext(ticket_id="t1", lab_path="")
        assert ctx.ticket_id == "t1"
        assert ctx.lab_path == ""
        assert ctx.mock_cli_state is None
        assert ctx.eveng_available is False
        assert ctx.command_history == []

    def test_context_with_mock_state(self):
        ctx = ValidationContext(
            ticket_id="t1", lab_path="/labs/test",
            mock_cli_state={"R1": {"hostname": "R1"}},
            command_history=[{"command": "show run"}],
        )
        assert ctx.mock_cli_state is not None
        assert len(ctx.command_history) == 1
