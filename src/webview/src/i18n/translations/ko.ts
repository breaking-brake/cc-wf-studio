/**
 * Claude Code Workflow Studio - Webview Korean Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const koWebviewTranslations: WebviewTranslationKeys = {
  // Toolbar
  'toolbar.workflowNamePlaceholder': '워크플로 이름',
  'toolbar.save': '저장',
  'toolbar.saving': '저장 중...',
  'toolbar.export': '내보내기',
  'toolbar.exporting': '내보내는 중...',
  'toolbar.generateWithAI': 'AI로 생성',
  'toolbar.refineWithAI': 'AI로 편집',
  'toolbar.selectWorkflow': '워크플로 선택...',
  'toolbar.load': '불러오기',
  'toolbar.refreshList': '워크플로 목록 새로고침',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '워크플로 이름이 필요합니다',
  'toolbar.error.workflowNameRequiredForExport': '내보내기에는 워크플로 이름이 필요합니다',
  'toolbar.error.selectWorkflowToLoad': '불러올 워크플로를 선택하세요',
  'toolbar.error.validationFailed': '워크플로 검증에 실패했습니다',
  'toolbar.error.missingEndNode': '워크플로에는 최소 1개의 End 노드가 필요합니다',
  'toolbar.error.noActiveWorkflow': '먼저 워크플로를 불러오세요',

  // Node Palette
  'palette.title': '노드 팔레트',
  'palette.basicNodes': '기본 노드',
  'palette.controlFlow': '제어 흐름',
  'palette.quickStart': '💡 빠른 시작',

  // Node types
  'node.prompt.title': 'Prompt',
  'node.prompt.description': '변수가 있는 템플릿',
  'node.subAgent.title': 'Sub-Agent',
  'node.subAgent.description': '전문 작업 실행',
  'node.end.title': 'End',
  'node.end.description': '워크플로 종료 지점',
  'node.branch.title': 'Branch',
  'node.branch.description': '조건 분기 로직',
  'node.branch.deprecationNotice':
    '더 이상 사용되지 않습니다. If/Else 또는 Switch 노드로 마이그레이션하세요',
  'node.ifElse.title': 'If/Else',
  'node.ifElse.description': '이진 조건 분기 (참/거짓)',
  'node.switch.title': 'Switch',
  'node.switch.description': '다중 조건 분기 (2-N 케이스)',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': '사용자 선택에 따라 분기',
  'node.skill.title': 'Skill',
  'node.skill.description': 'Claude Code Skill 실행',

  // Quick start instructions
  'palette.instruction.addNode': '노드를 클릭하여 캔버스에 추가',
  'palette.instruction.dragNode': '노드를 드래그하여 재배치',
  'palette.instruction.connectNodes': '출력에서 입력 핸들로 드래그하여 연결',
  'palette.instruction.editProperties': '노드를 선택하여 속성 편집',

  // Property Panel
  'property.title': '속성',
  'property.noSelection': '노드를 선택하여 속성 보기',

  // Node type badges
  'property.nodeType.subAgent': 'Sub-Agent',
  'property.nodeType.askUserQuestion': 'Ask User Question',
  'property.nodeType.branch': 'Branch Node',
  'property.nodeType.ifElse': 'If/Else Node',
  'property.nodeType.switch': 'Switch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.skill': 'Skill 노드',
  'property.nodeType.unknown': '알 수 없음',

  // Common property labels
  'property.nodeName': '노드 이름',
  'property.nodeName.placeholder': '노드 이름 입력',
  'property.nodeName.help': '내보내기 파일 이름으로 사용됨 (예: "data-analysis")',
  'property.description': '설명',
  'property.prompt': '프롬프트',
  'property.model': '모델',
  'property.label': '레이블',
  'property.label.placeholder': '레이블 입력',
  'property.evaluationTarget': '평가 대상',
  'property.evaluationTarget.placeholder': '예: 이전 단계의 실행 결과',
  'property.evaluationTarget.help': '분기 조건에서 평가할 대상을 자연어로 설명',

  // Start/End node descriptions
  'property.startNodeDescription':
    'Start 노드는 워크플로의 시작점입니다. 삭제할 수 없으며 편집 가능한 속성이 없습니다.',
  'property.endNodeDescription':
    'End 노드는 워크플로의 완료점입니다. 삭제할 수 없으며 편집 가능한 속성이 없습니다.',
  'property.unknownNodeType': '알 수 없는 노드 유형:',

  // Sub-Agent properties
  'property.tools': '도구 (쉼표로 구분)',
  'property.tools.placeholder': '예: Read,Write,Bash',
  'property.tools.help': '모든 도구를 사용하려면 비워 두세요',

  // Skill properties
  'property.skillPath': 'Skill 경로',
  'property.scope': '범위',
  'property.scope.personal': '개인',
  'property.scope.project': '프로젝트',
  'property.validationStatus': '검증 상태',
  'property.validationStatus.valid': '유효함',
  'property.validationStatus.missing': '찾을 수 없음',
  'property.validationStatus.invalid': '유효하지 않음',
  'property.validationStatus.valid.tooltip': 'Skill이 유효하며 사용할 수 있습니다',
  'property.validationStatus.missing.tooltip': '지정된 경로에서 SKILL.md 파일을 찾을 수 없습니다',
  'property.validationStatus.invalid.tooltip':
    'SKILL.md에 유효하지 않은 YAML frontmatter가 있습니다',
  'property.allowedTools': '허용된 도구',

  // AskUserQuestion properties
  'property.questionText': '질문',
  'property.multiSelect': '다중 선택',
  'property.multiSelect.enabled': '사용자가 여러 옵션을 선택할 수 있음 (선택 목록 출력)',
  'property.multiSelect.disabled': '사용자가 하나의 옵션을 선택 (해당 노드로 분기)',
  'property.aiSuggestions': 'AI가 옵션 제안',
  'property.aiSuggestions.enabled': 'AI가 컨텍스트를 기반으로 옵션을 동적으로 생성합니다',
  'property.aiSuggestions.disabled': '아래에서 옵션을 수동으로 정의',
  'property.options': '옵션',
  'property.optionsCount': '옵션 ({count}/4)',
  'property.optionNumber': '옵션 {number}',
  'property.addOption': '+ 옵션 추가',
  'property.remove': '제거',
  'property.optionLabel.placeholder': '레이블',
  'property.optionDescription.placeholder': '설명',

  // Prompt properties
  'property.promptTemplate': '프롬프트 템플릿',
  'property.promptTemplate.placeholder': '{{variables}}를 포함하는 프롬프트 템플릿 입력',
  'property.promptTemplate.help': '동적 값에는 {{variableName}} 구문 사용',
  'property.detectedVariables': '감지된 변수 ({count})',
  'property.variablesSubstituted': '변수는 런타임에 대체됩니다',

  // Branch properties
  'property.branchType': '분기 유형',
  'property.conditional': '조건부 (2방향)',
  'property.switch': '스위치 (다방향)',
  'property.branchType.conditional.help': '2개 분기 (True/False)',
  'property.branchType.switch.help': '다중 분기 (2-N 방향)',
  'property.branches': '분기',
  'property.branchesCount': '분기 ({count})',
  'property.branchNumber': '분기 {number}',
  'property.addBranch': '+ 분기 추가',
  'property.branchLabel': '레이블',
  'property.branchLabel.placeholder': '예: 성공, 오류',
  'property.branchCondition': '조건 (자연어)',
  'property.branchCondition.placeholder': '예: 이전 프로세스가 성공한 경우',
  'property.minimumBranches': '최소 2개의 분기가 필요합니다',

  // Default node labels
  'default.newSubAgent': '새 Sub-Agent',
  'default.enterPrompt': '여기에 프롬프트 입력',
  'default.newQuestion': '새 질문',
  'default.option': '옵션',
  'default.firstOption': '첫 번째 옵션',
  'default.secondOption': '두 번째 옵션',
  'default.newOption': '새 옵션',
  'default.newPrompt': '새 Prompt',
  'default.promptTemplate':
    '여기에 프롬프트 템플릿을 입력하세요.\n\n{{variableName}}과 같이 변수를 사용할 수 있습니다.',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '조건이 참일 때',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '조건이 거짓일 때',
  'default.case1': 'Case 1',
  'default.case1Condition': '조건 1이 충족될 때',
  'default.case2': 'Case 2',
  'default.case2Condition': '조건 2가 충족될 때',
  'default.case3': 'Case 3',
  'default.case3Condition': '조건 3이 충족될 때',
  'default.conditionPrefix': '조건 ',
  'default.conditionSuffix': '이 충족될 때',

  // Tour
  'tour.welcome':
    'Claude Code Workflow Studio에 오신 것을 환영합니다!\n\n이 투어에서는 주요 기능의 위치와 역할을 소개합니다. 첫 워크플로우를 만들기 전에 기본 사항을 익혀보세요.',
  'tour.nodePalette':
    '노드 팔레트에는 워크플로우에서 사용할 수 있는 다양한 노드가 있습니다.\n\nPrompt, Sub-Agent, AskUserQuestion, If/Else, Switch 등의 노드를 클릭하여 캔버스에 추가할 수 있습니다.',
  'tour.addPrompt':
    '이 "Prompt" 버튼으로 캔버스에 Prompt 노드를 추가할 수 있습니다.\n\nPrompt 노드는 변수를 지원하는 템플릿으로 워크플로우의 기본 구성 요소입니다.',
  'tour.canvas':
    '여기가 캔버스입니다. 노드를 드래그하여 위치를 조정하고 핸들을 드래그하여 노드를 연결할 수 있습니다.\n\n시작 및 종료 노드가 이미 배치되어 있습니다.',
  'tour.propertyPanel':
    '속성 패널에서 선택한 노드를 구성할 수 있습니다.\n\n노드 이름, 프롬프트, 모델 선택 등을 편집할 수 있습니다.',
  'tour.addAskUserQuestion':
    '"AskUserQuestion" 노드는 사용자 선택에 따라 워크플로우를 분기하는 데 사용됩니다.\n\n이 버튼으로 캔버스에 추가할 수 있습니다.',
  'tour.connectNodes':
    '노드를 연결하여 워크플로우를 만드세요.\n\n노드 오른쪽의 출력 핸들(⚪)에서 다른 노드 왼쪽의 입력 핸들로 드래그하세요.',
  'tour.workflowName':
    '여기에서 워크플로우에 이름을 지정할 수 있습니다.\n\n문자, 숫자, 하이픈 및 밑줄을 사용할 수 있습니다.',
  'tour.saveWorkflow':
    '"저장" 버튼을 클릭하면 워크플로우가 `.vscode/workflows/` 디렉터리에 JSON으로 저장됩니다.\n\n나중에 로드하여 계속 편집할 수 있습니다.',
  'tour.loadWorkflow':
    '저장된 워크플로우를 로드하려면 드롭다운 메뉴에서 워크플로우를 선택하고 "불러오기" 버튼을 클릭하세요.',
  'tour.exportWorkflow':
    '"내보내기" 버튼을 클릭하면 Claude Code에서 실행 가능한 형식으로 내보내집니다.\n\nSub-Agent는 `.claude/agents/`로, SlashCommand는 `.claude/commands/`로 이동합니다.',
  'tour.refineWithAI':
    '"AI로 편집" 버튼을 사용하여 AI와 대화하며 워크플로우를 생성하거나 개선할 수 있습니다.\n\n빈 캔버스에서 시작하거나 기존 워크플로우를 대화형으로 수정할 수 있습니다.',
  'tour.helpButton':
    '이 투어를 다시 보려면 도움말 버튼(?)을 클릭하세요.\n\n워크플로우 생성을 즐기세요!',

  // Tour buttons
  'tour.button.back': '뒤로',
  'tour.button.close': '닫기',
  'tour.button.finish': '완료',
  'tour.button.next': '다음 ({step}/{steps})',
  'tour.button.skip': '건너뛰기',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '노드 삭제',
  'dialog.deleteNode.message': '이 노드를 삭제하시겠습니까?',
  'dialog.deleteNode.confirm': '삭제',
  'dialog.deleteNode.cancel': '취소',

  // Skill Browser Dialog
  'skill.browser.title': 'Skill 탐색',
  'skill.browser.description':
    '워크플로에 추가할 Claude Code Skill을 선택하세요.\nSkill은 Claude Code가 자동으로 활용하는 전문적인 능력입니다.',
  'skill.browser.personalTab': '개인',
  'skill.browser.projectTab': '프로젝트',
  'skill.browser.noSkills': '이 디렉터리에서 Skill을 찾을 수 없습니다',
  'skill.browser.loading': 'Skill 로드 중...',
  'skill.browser.selectButton': '워크플로에 추가',
  'skill.browser.cancelButton': '취소',
  'skill.browser.skillName': 'Skill 이름',
  'skill.browser.skillDescription': '설명',
  'skill.browser.skillPath': '경로',
  'skill.browser.validationStatus': '상태',

  // Skill Browser Errors
  'skill.error.loadFailed': 'Skill을 로드하지 못했습니다. Skill 디렉터리를 확인하세요.',
  'skill.error.noSelection': 'Skill을 선택하세요',
  'skill.error.unknown': '예기치 않은 오류가 발생했습니다',

  // Skill Creation Dialog
  'skill.creation.title': '새 스킬 만들기',
  'skill.creation.description':
    '새로운 Claude Code 스킬을 만듭니다. 스킬은 Claude Code가 특정 작업을 수행하기 위해 호출할 수 있는 전문 도구입니다.',
  'skill.creation.nameLabel': '스킬 이름',
  'skill.creation.nameHint': '소문자, 숫자, 하이픈만 사용 (최대 64자)',
  'skill.creation.descriptionLabel': '설명',
  'skill.creation.descriptionPlaceholder': '이 스킬이 수행하는 작업과 사용 시점에 대한 간단한 설명',
  'skill.creation.instructionsLabel': '지침',
  'skill.creation.instructionsPlaceholder':
    'Markdown 형식으로 자세한 지침을 입력하세요.\n\n예:\n# My Skill\n\n이 스킬은...',
  'skill.creation.instructionsHint': 'Claude Code용 Markdown 형식 지침',
  'skill.creation.allowedToolsLabel': '허용된 도구 (선택사항)',
  'skill.creation.allowedToolsHint': '쉼표로 구분된 도구 이름 목록 (예: Read, Grep, Glob)',
  'skill.creation.scopeLabel': '범위',
  'skill.creation.scopePersonal': '개인용 (~/.claude/skills/)',
  'skill.creation.scopeProject': '프로젝트용 (.claude/skills/)',
  'skill.creation.cancelButton': '취소',
  'skill.creation.createButton': '스킬 만들기',
  'skill.creation.creatingButton': '만드는 중...',
  'skill.creation.error.unknown': '스킬 생성에 실패했습니다. 다시 시도해 주세요.',

  // Skill Validation Errors
  'skill.validation.nameRequired': '스킬 이름은 필수입니다',
  'skill.validation.nameTooLong': '스킬 이름은 64자 이하여야 합니다',
  'skill.validation.nameInvalidFormat': '스킬 이름은 소문자, 숫자, 하이픈만 사용할 수 있습니다',
  'skill.validation.descriptionRequired': '설명은 필수입니다',
  'skill.validation.descriptionTooLong': '설명은 1024자 이하여야 합니다',
  'skill.validation.instructionsRequired': '지침은 필수입니다',
  'skill.validation.scopeRequired': '범위(개인용/프로젝트용)를 선택해 주세요',

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': 'AI로 개선',
  'refinement.toolbar.refineButton.tooltip': 'AI와 채팅하여 워크플로를 개선합니다',

  // Refinement Chat Panel (Short form keys for components)
  'refinement.title': 'AI로 편집',
  'refinement.inputPlaceholder': '변경하고 싶은 내용을 입력하세요...',
  'refinement.sendButton': '전송',
  'refinement.cancelButton': '취소',
  'refinement.processing': '처리 중...',
  'refinement.aiProcessing': 'AI가 요청을 처리하고 있습니다...',
  'refinement.charactersRemaining': '남은 문자 수: {count}',
  'refinement.iterationCounter': '편집 횟수: {current}회',
  'refinement.iterationCounter.tooltip':
    '편집 횟수가 많으면 저장·불러오기가 느려지고 편집 작업에 지장이 생길 수 있습니다',
  'refinement.warning.title': '긴 대화',
  'refinement.warning.message':
    '대화 기록이 길어져 파일 크기가 증가하고 성능에 영향을 줄 수 있습니다. 대화 기록 지우기를 고려해 주세요.',

  // Refinement Chat Panel (Detailed keys)
  'refinement.chat.title': '워크플로 개선 채팅',
  'refinement.chat.description':
    'AI와 채팅하여 워크플로를 점진적으로 개선할 수 있습니다. 원하는 변경 사항을 설명하면 AI가 자동으로 워크플로를 업데이트합니다.',
  'refinement.chat.inputPlaceholder': '변경 사항을 입력하세요 (예: "오류 처리 추가")',
  'refinement.chat.sendButton': '전송',
  'refinement.chat.sendButton.shortcut': 'Ctrl+Enter로 전송',
  'refinement.chat.sendButton.shortcutMac': 'Cmd+Enter로 전송',
  'refinement.chat.cancelButton': '취소',
  'refinement.chat.closeButton': '닫기',
  'refinement.chat.clearButton': '대화 지우기',
  'refinement.chat.clearButton.tooltip': '대화 기록을 지우고 처음부터 시작합니다',
  'refinement.chat.refining': 'AI가 워크플로를 개선하는 중... 최대 120초가 소요될 수 있습니다.',
  'refinement.chat.progressTime': '{elapsed}초 / {max}초',
  'refinement.chat.characterCount': '{count} / {max} 자',
  'refinement.chat.iterationCounter': '반복 {current} / {max}',
  'refinement.chat.iterationWarning': '반복 제한에 가까워지고 있습니다 ({current}/{max})',
  'refinement.chat.iterationLimitReached':
    '최대 반복 횟수에 도달했습니다 ({max}). 계속하려면 대화를 지우세요.',
  'refinement.chat.noMessages': '아직 메시지가 없습니다. 개선하고 싶은 내용을 입력하세요.',
  'refinement.chat.userMessageLabel': '나',
  'refinement.chat.aiMessageLabel': 'AI',
  'refinement.chat.success': '워크플로 개선이 완료되었습니다!',
  'refinement.chat.changesSummary': '변경 사항: {summary}',

  // Refinement Errors
  'refinement.error.emptyMessage': '메시지를 입력하세요',
  'refinement.error.messageTooLong': '메시지가 너무 깁니다 (최대 {max}자)',
  'refinement.error.commandNotFound':
    'Claude Code CLI를 찾을 수 없습니다. AI 개선 기능을 사용하려면 Claude Code를 설치하세요.',
  'refinement.error.timeout': 'AI 개선 시간이 초과되었습니다. 다시 시도하거나 요청을 단순화하세요.',
  'refinement.error.parseError':
    'AI 응답 파싱에 실패했습니다. 다시 시도하거나 요청을 다시 표현하세요.',
  'refinement.error.validationError':
    '개선된 워크플로가 검증에 실패했습니다. 다른 요청을 시도하세요.',
  'refinement.error.iterationLimitReached':
    '최대 반복 횟수(20)에 도달했습니다. 대화 기록을 지우고 처음부터 시작하거나 워크플로를 수동으로 편집하세요.',
  'refinement.error.unknown': '예상치 못한 오류가 발생했습니다. 로그를 확인하세요.',

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': '다시 시도',

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': 'AI가 처리 중입니다...',

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': '대화 지우기',
  'refinement.clearDialog.message': '대화 기록을 지우시겠습니까? 이 작업은 취소할 수 없습니다.',
  'refinement.clearDialog.confirm': '지우기',
  'refinement.clearDialog.cancel': '취소',

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description': '실현하려는 워크플로를 자연어로 설명해주세요.',
  'refinement.initialMessage.note': '※ 이 기능은 환경에 설치된 Claude Code를 사용합니다.',
};
