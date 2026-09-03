import type { Mode } from '../data/tools';

export interface ProcessSetupState {
  stage: string;
  objectives: string[];
  level: string;
  goal: string;
  groupSize: string;
  duration: string;
  facilitator: string;
  mode: Mode | '';
}

export const DEFAULT_PROCESS_SETUP: ProcessSetupState = {
  stage: '',
  objectives: [],
  level: '',
  goal: '',
  groupSize: '',
  duration: '',
  facilitator: '',
  mode: '',
};

interface InitiativeSetupFields {
  setupStage: string | null;
  setupObjectives: string[];
  setupParticipationLevel: string | null;
  setupGoal: string | null;
  setupGroupSize: string | null;
  setupDuration: string | null;
  setupFacilitator: string | null;
  setupMode: string | null;
  setupSelectedTools: string[];
}

export function processSetupFromInitiative(initiative: InitiativeSetupFields): ProcessSetupState {
  return {
    stage: initiative.setupStage || '',
    objectives: initiative.setupObjectives || [],
    level: initiative.setupParticipationLevel || '',
    goal: initiative.setupGoal || '',
    groupSize: initiative.setupGroupSize || '',
    duration: initiative.setupDuration || '',
    facilitator: initiative.setupFacilitator || '',
    mode: (initiative.setupMode as Mode) || '',
  };
}

export function processSetupToPatchBody(setup: ProcessSetupState) {
  return {
    stage: setup.stage,
    setupObjectives: setup.objectives,
    participationLevel: setup.level,
    goal: setup.goal,
    groupSize: setup.groupSize,
    duration: setup.duration,
    facilitator: setup.facilitator,
    mode: setup.mode,
  };
}
