import type { CommandName } from '../contracts/types';
import type { CommandImpl } from './types';
import { impl as projectImport } from './project.import';
import { impl as transcriptRequest } from './transcript.request';
import { impl as proposalRequest } from './proposal.request';
import { impl as proposalExclude } from './proposal.exclude';
import { impl as proposalApply } from './proposal.apply';
import { impl as proposalDiscard } from './proposal.discard';
import { impl as clipSplit } from './clip.split';
import { impl as clipTrim } from './clip.trim';
import { impl as clipMove } from './clip.move';
import { impl as clipDelete } from './clip.delete';
import { impl as captionsToggle } from './captions.toggle';
import { impl as transcriptFixWord } from './transcript.fixWord';
import { impl as styleSetField } from './style.setField';
import { impl as styleUpdateProposalAccept } from './style.updateProposal.accept';
import { impl as styleUpdateProposalReject } from './style.updateProposal.reject';
import { impl as projectUpgradeStyle } from './project.upgradeStyle';
import { impl as styleRollback } from './style.rollback';
import { impl as historyUndo } from './history.undo';
import { impl as historyRedo } from './history.redo';
import { impl as exportMp4 } from './export.mp4';

/** السجل الموحد (الدستور VII): تنفيذ واحد لكل اسم في commands.schema.json. */
export const commands: { [N in CommandName]: CommandImpl<N> } = {
  'project.import': projectImport,
  'transcript.request': transcriptRequest,
  'proposal.request': proposalRequest,
  'proposal.exclude': proposalExclude,
  'proposal.apply': proposalApply,
  'proposal.discard': proposalDiscard,
  'clip.split': clipSplit,
  'clip.trim': clipTrim,
  'clip.move': clipMove,
  'clip.delete': clipDelete,
  'captions.toggle': captionsToggle,
  'transcript.fixWord': transcriptFixWord,
  'style.setField': styleSetField,
  'style.updateProposal.accept': styleUpdateProposalAccept,
  'style.updateProposal.reject': styleUpdateProposalReject,
  'project.upgradeStyle': projectUpgradeStyle,
  'style.rollback': styleRollback,
  'history.undo': historyUndo,
  'history.redo': historyRedo,
  'export.mp4': exportMp4,
};

