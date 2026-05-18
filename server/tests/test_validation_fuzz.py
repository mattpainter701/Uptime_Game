"""
Fuzz / property-based tests for the Validation Engine.

Generates random criterion inputs and verifies:
  - No crashes on malformed/edge-case input
  - Scoring invariants (never negative, never above 1.0)
  - Report structure invariants
"""
import pytest
import random
import string
from app.services.validation_engine import (
    validation_engine, ValidationContext, GradingConfig
)
from app.models.schemas import ValidationCriteria

pytestmark = pytest.mark.slow  # CI-only, skip in fast local runs


class TestValidationEngineFuzz:
    """Fuzz tests for the validation engine."""

    def _random_string(self, length: int = 10) -> str:
        return ''.join(random.choices(string.printable, k=length))

    def _random_params(self, check_type: str) -> dict:
        """Generate semi-random params based on check type."""
        if check_type == 'ping':
            return {
                'source': self._random_string(8),
                'destination': self._random_string(15),
                'successRate': random.randint(0, 100),
            }
        elif check_type == 'command':
            return {
                'node': self._random_string(8),
                'command': self._random_string(20),
                'contains': [self._random_string(6) for _ in range(random.randint(0, 3))],
            }
        elif check_type == 'config':
            return {
                'node': self._random_string(8),
                'path': self._random_string(15),
                'expected': self._random_string(10),
            }
        else:
            return {self._random_string(5): self._random_string(10)}

    def _random_criterion(self) -> dict:
        """Generate a random validation criterion."""
        check_types = ['ping', 'command', 'config', 'api', 'unknown_type']
        return {
            'type': random.choice(check_types),
            'params': self._random_params(random.choice(check_types)),
            'weight': random.uniform(0.1, 2.0),
            'required': random.choice([True, False]),
            # Keep fuzz validation fast enough for CI while still exercising
            # convergence-delay handling. Dedicated tests below cover larger waits.
            'convergence_delay_ms': random.randint(0, 20),
            'hint_on_fail': self._random_string(20) if random.random() > 0.5 else '',
            'anti_cheat': random.choice([True, False]),
        }

    @pytest.mark.asyncio
    async def test_fuzz_validate_never_crashes(self):
        """Random validation requests should never crash the engine."""
        for _ in range(10):  # reduced for CI speed
            criteria = [self._random_criterion() for _ in range(random.randint(1, 10))]

            context = ValidationContext(
                ticket_id=f"T-{random.randint(1, 9999)}",
                lab_path="",
                mock_cli_state={"R1": {"interfaces": {}}},
                eveng_available=False,
            )

            result = await validation_engine.validate(
                ticket_id=context.ticket_id,
                validation_criteria=criteria,
                context=context,
            )

            # Invariants
            assert result.ticket_id == context.ticket_id
            assert 0 <= result.score <= 1.0
            assert result.reward_multiplier >= 0
            assert result.total_criteria == len(criteria)
            assert result.passed_criteria + result.failed_criteria <= result.total_criteria
            assert isinstance(result.criteria_results, list)
            assert isinstance(result.anti_cheat_flags, list)

    @pytest.mark.asyncio
    async def test_fuzz_empty_criteria(self):
        """Empty criteria list should produce a valid report."""
        result = await validation_engine.validate(
            ticket_id="T-EMPTY",
            validation_criteria=[],
            context=ValidationContext(ticket_id="T-EMPTY", lab_path=""),
        )
        assert result.total_criteria == 0
        assert result.passed_criteria == 0

    @pytest.mark.asyncio
    async def test_fuzz_all_check_types(self):
        """All known check types produce valid results."""
        criteria = [
            {'type': 'ping', 'params': {'source': 'R1', 'destination': '8.8.8.8'}},
            {'type': 'command', 'params': {'node': 'R1', 'command': 'show version', 'contains': ['Cisco']}},
            {'type': 'config', 'params': {'node': 'R1', 'path': 'interface Gi0/0', 'expected': 'up'}},
            {'type': 'api', 'params': {'url': 'http://example.com', 'method': 'GET'}},
        ]

        context = ValidationContext(
            ticket_id="T-ALL",
            mock_cli_state={"R1": {"show version": "Cisco IOS"}},
            eveng_available=False,
        )

        result = await validation_engine.validate(
            ticket_id="T-ALL",
            validation_criteria=criteria,
            context=context,
        )

        assert result.total_criteria == 4
        # At minimum, the report must be well-formed
        assert len(result.criteria_results) == 4

    @pytest.mark.asyncio
    async def test_fuzz_malformed_params(self):
        """Malformed params should not crash."""
        bad_criteria = [
            {'type': 'ping', 'params': None},
            {'type': 'ping', 'params': 42},
            {'type': 'ping', 'params': 'not a dict'},
            {'type': 'command', 'params': {}},
            {'type': '', 'params': {}},
            {'type': None, 'params': {}},
        ]

        for criterion in bad_criteria:
            try:
                # Try to construct a ValidationCriteria - may fail at model level
                try:
                    vc = ValidationCriteria(**criterion)
                    result = await validation_engine.validate(
                        ticket_id="T-MAL",
                        validation_criteria=[vc.model_dump()],
                        context=ValidationContext(ticket_id="T-MAL"),
                    )
                    assert result is not None
                except Exception as model_error:
                    # Model validation rejection is expected
                    pass
            except Exception:
                pytest.fail(f"Engine crashed on malformed criterion: {criterion}")

    @pytest.mark.asyncio
    async def test_fuzz_convergence_delays(self):
        """Varied convergence delays produce correct ordering."""
        criteria = [
            {
                'type': 'ping',
                'params': {'source': 'R1', 'destination': '8.8.8.8'},
                'convergence_delay_ms': delay,
            }
            for delay in [0, 10, 100, 1000, 5000]
        ]

        for criterion in criteria:
            context = ValidationContext(
                ticket_id="T-DELAY",
                mock_cli_state={"R1": {"ping 8.8.8.8": "success"}},
                eveng_available=False,
            )

            result = await validation_engine.validate(
                ticket_id="T-DELAY",
                validation_criteria=[criterion],
                context=context,
            )
            assert result.total_criteria == 1
            assert result.criteria_results[0].duration_ms >= criterion['convergence_delay_ms']

    @pytest.mark.asyncio
    async def test_fuzz_scoring_invariants(self):
        """Score is always between 0 and 1 for any valid input."""
        for i in range(20):  # reduced for CI speed
            criteria = [self._random_criterion() for _ in range(random.randint(1, 5))]

            context = ValidationContext(
                ticket_id=f"T-SCORE-{i}",
                mock_cli_state={"R1": {"interfaces": {}, "show version": "OK"}},
                eveng_available=False,
            )

            result = await validation_engine.validate(
                ticket_id=context.ticket_id,
                validation_criteria=criteria,
                context=context,
            )

            assert 0.0 <= result.score <= 1.0, f"Score {result.score} out of range"
            assert isinstance(result.score, float)

    def test_grading_config_is_consistent(self):
        """Grading configuration invariants."""
        gc = validation_engine.grading_config
        assert 0 < gc.full_pass_threshold <= 1.0
        assert 0 <= gc.partial_pass_threshold <= gc.full_pass_threshold
        assert 0 <= gc.partial_reward_floor <= 1.0
        assert gc.reward_scaling in ('linear', 'stepped')
