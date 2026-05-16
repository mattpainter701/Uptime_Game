export function getReputationLossForFailure(incidentCount: number, baseLoss = 5): number {
  const safeIncidentCount = Math.max(0, Math.floor(incidentCount));
  const extraLoss = Math.floor(Math.max(0, safeIncidentCount - 1) / 3);

  return Math.max(baseLoss, baseLoss + extraLoss);
}
