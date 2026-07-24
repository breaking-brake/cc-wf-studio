/**
 * Default node construction shared by the Node Palette buttons and the
 * edge-drop picker, so a node created either way starts identical.
 *
 * Only covers node types that need no configuration dialog — dialog-based
 * types (Sub-Agent, Skill, MCP, Codex, Sub-Agent Flow) and layout-only
 * types (Group) are created by their own palette flows.
 */

import { generateBranchId, generateOptionId } from '@cc-wf-studio/core';
import type { Node } from 'reactflow';
import type { WebviewTranslationKeys } from '../i18n/translation-keys';

/** Subset of the i18n `t` accepted here (assignable from useTranslation's t) */
export type TranslateFn = (
  key: keyof WebviewTranslationKeys,
  params?: Record<string, string | number>
) => string;

/** Node types creatable without a configuration dialog */
export type SimpleNodeType =
  | 'prompt'
  | 'askUserQuestion'
  | 'ifElse'
  | 'switch'
  | 'branchSession'
  | 'end';

export function createDefaultNode(
  type: SimpleNodeType,
  position: { x: number; y: number },
  t: TranslateFn
): Node {
  switch (type) {
    case 'prompt':
      return {
        id: `prompt-${Date.now()}`,
        type: 'prompt',
        position,
        data: {
          label: t('default.newPrompt'),
          prompt: t('default.prompt'),
          variables: {},
        },
      };
    case 'askUserQuestion':
      return {
        id: `question-${Date.now()}`,
        type: 'askUserQuestion',
        position,
        data: {
          questionText: t('default.newQuestion'),
          options: [
            {
              id: generateOptionId(),
              label: `${t('default.option')} 1`,
              description: t('default.firstOption'),
            },
            {
              id: generateOptionId(),
              label: `${t('default.option')} 2`,
              description: t('default.secondOption'),
            },
          ],
          outputPorts: 2,
        },
      };
    case 'ifElse':
      return {
        id: `ifelse-${Date.now()}`,
        type: 'ifElse',
        position,
        data: {
          evaluationTarget: '',
          branches: [
            {
              id: generateBranchId(),
              label: t('default.branchTrue'),
              condition: t('default.branchTrueCondition'),
            },
            {
              id: generateBranchId(),
              label: t('default.branchFalse'),
              condition: t('default.branchFalseCondition'),
            },
          ],
          outputPorts: 2 as const,
        },
      };
    case 'switch':
      return {
        id: `switch-${Date.now()}`,
        type: 'switch',
        position,
        data: {
          evaluationTarget: '',
          branches: [
            {
              id: generateBranchId(),
              label: t('default.case1'),
              condition: t('default.case1Condition'),
              isDefault: false,
            },
            {
              id: generateBranchId(),
              label: t('default.case2'),
              condition: t('default.case2Condition'),
              isDefault: false,
            },
            {
              id: generateBranchId(),
              label: t('default.defaultBranch'),
              condition: t('default.defaultBranchCondition'),
              isDefault: true,
            },
          ],
          outputPorts: 3,
        },
      };
    case 'branchSession':
      return {
        id: `branch-session-${Date.now()}`,
        type: 'branchSession',
        position,
        data: {
          label: t('default.newBranchSession'),
          workDescription: '',
          outputPorts: 1 as const,
        },
      };
    case 'end':
      return {
        id: `end_${Date.now()}`,
        type: 'end',
        position,
        data: {
          label: 'End',
        },
      };
  }
}
