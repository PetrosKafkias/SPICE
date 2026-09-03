export type PhaseState = 'completed' | 'current' | 'incomplete';

export function phaseState(phaseNumber: number, currentPhaseNumber: number | null, pilotFinalized: boolean): PhaseState {
  if (pilotFinalized) return 'completed';
  if (currentPhaseNumber == null) return 'incomplete';
  if (phaseNumber < currentPhaseNumber) return 'completed';
  if (phaseNumber === currentPhaseNumber) return 'current';
  return 'incomplete';
}
