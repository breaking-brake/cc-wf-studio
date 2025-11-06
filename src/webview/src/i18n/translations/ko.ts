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
  'toolbar.selectWorkflow': '워크플로 선택...',
  'toolbar.load': '불러오기',
  'toolbar.refreshList': '워크플로 목록 새로고침',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '워크플로 이름이 필요합니다',
  'toolbar.error.workflowNameRequiredForExport': '내보내기에는 워크플로 이름이 필요합니다',
  'toolbar.error.selectWorkflowToLoad': '불러올 워크플로를 선택하세요',
  'toolbar.error.validationFailed': '워크플로 검증에 실패했습니다',

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
    'Claude Code Workflow Studio에 오신 것을 환영합니다!\n\n이 투어는 첫 워크플로우 생성 방법을 안내합니다.',
  'tour.nodePalette':
    '노드 팔레트에는 워크플로우에서 사용할 수 있는 다양한 노드가 있습니다.\n\nPrompt, Sub-Agent, AskUserQuestion, If/Else, Switch 등의 노드를 클릭하여 캔버스에 추가할 수 있습니다.',
  'tour.addPrompt':
    '"Prompt" 버튼을 클릭하여 첫 번째 노드를 추가하세요.\n\nPrompt 노드는 변수를 지원하는 템플릿으로 워크플로우의 기본 구성 요소입니다.',
  'tour.canvas':
    '여기가 캔버스입니다. 노드를 드래그하여 위치를 조정하고 핸들을 드래그하여 노드를 연결할 수 있습니다.\n\n시작 및 종료 노드가 이미 배치되어 있습니다.',
  'tour.propertyPanel':
    '속성 패널에서 선택한 노드를 구성할 수 있습니다.\n\n노드 이름, 프롬프트, 모델 선택 등을 편집할 수 있습니다.',
  'tour.addAskUserQuestion':
    '이제 "AskUserQuestion" 노드를 추가하세요.\n\n이 노드를 사용하면 사용자 선택에 따라 워크플로우를 분기할 수 있습니다.',
  'tour.connectNodes':
    '노드를 연결하여 워크플로우를 만드세요.\n\n노드 오른쪽의 출력 핸들(⚪)에서 다른 노드 왼쪽의 입력 핸들로 드래그하세요.',
  'tour.workflowName':
    '워크플로우에 이름을 지정하세요.\n\n문자, 숫자, 하이픈 및 밑줄을 사용할 수 있습니다.',
  'tour.saveWorkflow':
    '"저장" 버튼을 클릭하면 워크플로우가 `.vscode/workflows/` 디렉터리에 JSON으로 저장됩니다.\n\n나중에 로드하여 계속 편집할 수 있습니다.',
  'tour.loadWorkflow':
    '저장된 워크플로우를 로드하려면 드롭다운 메뉴에서 워크플로우를 선택하고 "불러오기" 버튼을 클릭하세요.',
  'tour.exportWorkflow':
    '"내보내기" 버튼을 클릭하면 Claude Code에서 실행 가능한 형식으로 내보내집니다.\n\nSub-Agent는 `.claude/agents/`로, SlashCommand는 `.claude/commands/`로 이동합니다.',
  'tour.generateWithAI':
    '"AI로 생성" 버튼을 사용하여 자연어 설명으로부터 워크플로우를 자동 생성할 수 있습니다.\n\n예: "코드를 스캔하고 사용자에게 우선순위를 묻고 수정 제안을 생성하는 코드 검토 워크플로 만들기"라고 입력하면 완전한 워크플로우가 생성됩니다.',
  'tour.helpButton':
    '이 투어를 다시 보려면 도움말 버튼(?)을 클릭하세요.\n\n워크플로우 생성을 즐기세요!',

  // Tour buttons
  'tour.button.back': '뒤로',
  'tour.button.close': '닫기',
  'tour.button.finish': '완료',
  'tour.button.next': '다음',
  'tour.button.skip': '건너뛰기',

  // AI Generation Dialog
  'ai.dialogTitle': 'AI로 워크플로 생성',
  'ai.dialogDescription':
    '자연어로 생성하려는 워크플로를 설명하세요. AI가 노드와 연결이 포함된 완전한 워크플로를 생성합니다.',
  'ai.descriptionLabel': '워크플로 설명',
  'ai.descriptionPlaceholder':
    '예: 코드를 스캔하고 사용자에게 우선순위 수준을 묻고 수정 제안을 생성하는 코드 검토 워크플로 만들기',
  'ai.characterCount': '{count} / {max} 자',
  'ai.generating': '워크플로 생성 중... 최대 60초 소요될 수 있습니다.',
  'ai.generateButton': '생성',
  'ai.cancelButton': '취소',
  'ai.success': '워크플로가 성공적으로 생성되었습니다!',
  'ai.usageNote': '*1 이 기능은 사용자 환경에 설치된 Claude Code를 사용합니다.',
  'ai.overwriteWarning':
    '*2 워크플로를 생성하면 현재 워크플로가 완전히 덮어쓰여집니다. 계속하기 전에 작업 내용을 저장하세요.',

  // AI Generation Errors
  'ai.error.emptyDescription': '워크플로 설명을 입력하세요',
  'ai.error.descriptionTooLong': '설명이 너무 깁니다 (최대 {max}자)',
  'ai.error.commandNotFound':
    'Claude Code CLI를 찾을 수 없습니다. AI 생성 기능을 사용하려면 Claude Code를 설치하세요.',
  'ai.error.timeout': '요청 시간이 초과되었습니다. 다시 시도하거나 설명을 간소화하세요.',
  'ai.error.parseError': '생성에 실패했습니다 - 다시 시도하거나 설명을 다시 작성하세요',
  'ai.error.validationError': '생성된 워크플로 검증에 실패했습니다',
  'ai.error.unknown': '예기치 않은 오류가 발생했습니다. 다시 시도하세요.',
};
