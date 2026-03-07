/**
 * CC Workflow Studio - Webview Korean Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const koWebviewTranslations: WebviewTranslationKeys = {
  // Common
  loading: '로딩 중',
  description: '설명',
  optional: '선택 사항',
  cancel: '취소',
  'common.close': '닫기',
  'common.cancel': '취소',
  'loading.importWorkflow': '워크플로 가져오는 중...',
  'loading.openWorkflow': '워크플로 여는 중...',

  // Preview mode
  'preview.label': '미리보기',
  'preview.loading': '워크플로 로딩 중...',
  'preview.parseError': '워크플로 파싱에 실패했습니다',
  'preview.openInEditor': '편집',
  'preview.versionBefore': '수정 전',
  'preview.versionAfter': '수정 후',

  // Toolbar
  'toolbar.workflowNamePlaceholder': '워크플로 이름',
  'toolbar.save': '저장',
  'toolbar.saving': '저장 중...',
  'toolbar.export': '내보내기',
  'toolbar.export.tooltip': 'Slash Command로 내보내 .claude/commands/에 저장',
  'toolbar.exporting': '내보내는 중...',
  'toolbar.refineWithAI': 'AI로 편집',
  'toolbar.selectWorkflow': '워크플로 선택...',
  'toolbar.load': '불러오기',
  'toolbar.loading': '불러오는 중...',
  'toolbar.refreshList': '워크플로 목록 새로고침',

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': '손바닥',
  'toolbar.interactionMode.rangeSelectionButton': '범위 선택',
  'toolbar.interactionMode.switchToPan': '손바닥 모드로 전환',
  'toolbar.interactionMode.switchToSelection': '선택 모드로 전환',

  // Toolbar minimap toggle
  'toolbar.minimapToggle.show': '미니맵 표시',
  'toolbar.minimapToggle.hide': '미니맵 숨기기',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '워크플로 이름이 필요합니다',
  'toolbar.error.workflowNameInvalid': '영문 소문자(a-z), 숫자, 하이픈, 밑줄만 사용할 수 있습니다',
  'toolbar.error.workflowNameRequiredForExport': '내보내기에는 워크플로 이름이 필요합니다',
  'toolbar.error.selectWorkflowToLoad': '불러올 워크플로를 선택하세요',
  'toolbar.error.validationFailed': '워크플로 검증에 실패했습니다',
  'toolbar.error.missingEndNode': '워크플로에는 최소 1개의 End 노드가 필요합니다',
  'toolbar.error.noActiveWorkflow': '먼저 워크플로를 불러오세요',
  'toolbar.error.invalidWorkflowFile':
    '잘못된 워크플로 파일입니다. 유효한 JSON 워크플로 파일을 선택해주세요.',
  'toolbar.generateNameWithAI': 'AI로 이름 생성',
  'toolbar.error.nameGenerationFailed':
    '워크플로 이름 생성에 실패했습니다. 다시 시도하거나 수동으로 입력하세요.',

  // Toolbar slash command group
  'toolbar.run': '실행',
  'toolbar.running': '실행 중...',

  // Toolbar slash command options dropdown
  'toolbar.slashCommandOptions.frontmatterReferenceUrl':
    'https://code.claude.com/docs/ko/slash-commands#프론트매터',

  // Toolbar hooks configuration dropdown
  'hooks.title': 'Hooks',
  'hooks.preToolUse': 'PreToolUse',
  'hooks.postToolUse': 'PostToolUse',
  'hooks.stop': 'Stop',
  'hooks.addEntry': '추가',
  'hooks.removeEntry': '삭제',
  'hooks.matcher.description': '일치할 도구 이름 패턴',
  'hooks.once.description': '세션당 한 번만 실행',
  'hooks.validation.commandRequired': 'command는 필수입니다',
  'hooks.validation.commandTooLong': 'command가 최대 길이를 초과했습니다',
  'hooks.validation.matcherRequired': '이 훅 유형에는 matcher가 필수입니다',

  // Argument Hint configuration
  'argumentHint.example': '예:',
  'argumentHint.exampleAdd': '태그 추가',
  'argumentHint.exampleRemove': '태그 삭제',
  'argumentHint.exampleList': '목록 표시',

  // Toolbar more actions dropdown
  'toolbar.moreActions': '더보기',
  'toolbar.help': '도움말',

  // Copilot Execution Mode
  'copilot.mode.tooltip': 'Copilot 실행 모드 선택',
  'copilot.mode.cli': 'Copilot CLI',
  'copilot.mode.vscode': 'VSCode Copilot',

  // Node Palette
  'palette.title': '노드 팔레트',
  'palette.basicNodes': '기본 노드',
  'palette.specialNodes': '특수 노드',
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

  // Codex Node (Feature: 518-codex-agent-node)
  'node.codex.title': 'Codex Agent',
  'node.codex.description': 'OpenAI Codex CLI 실행',
  'node.codex.untitled': '제목 없는 Codex Agent',
  'node.codex.aiGenerated': 'AI 생성',

  // Codex Dialog (Feature: 518-codex-agent-node)
  'codex.title': 'Codex Agent 생성',
  'codex.description': '워크플로용 OpenAI Codex CLI 에이전트를 구성합니다.',
  'codex.nameLabel': '이름',
  'codex.namePlaceholder': '예: code-reviewer',
  'codex.promptModeLabel': '프롬프트 모드',
  'codex.promptMode.fixed': '고정',
  'codex.promptMode.aiGenerated': 'AI 생성',
  'codex.promptMode.aiGeneratedHelp': '오케스트레이터 AI가 컨텍스트에 따라 지침을 생성합니다.',
  'codex.promptLabel': '프롬프트',
  'codex.promptPlaceholder': 'Codex 에이전트에 대한 지침을 입력하세요...',
  'codex.promptGuidanceLabel': '가이던스 (선택사항)',
  'codex.promptGuidancePlaceholder': 'AI 생성 시 힌트 (선택사항)...',
  'codex.modelLabel': '모델',
  'codex.model.custom': '사용자 정의',
  'codex.customModelPlaceholder': '예: gpt-6.0-codex',
  'codex.reasoningEffortLabel': '추론 수준',
  'codex.reasoningEffort.low': '낮음',
  'codex.reasoningEffort.medium': '중간',
  'codex.reasoningEffort.high': '높음',
  'codex.sandboxLabel': '샌드박스 모드',
  'codex.sandbox.readOnly': '읽기 전용',
  'codex.sandbox.workspaceWrite': '워크스페이스 쓰기',
  'codex.sandbox.dangerFullAccess': '전체 액세스 (위험)',
  'codex.sandboxHelp': 'Codex 에이전트의 파일 시스템 액세스 권한을 제어합니다.',
  'codex.sandboxDefaultHelp': 'Codex 기본 동작을 사용합니다 (-s 옵션 없음).',
  'codex.advancedOptions': '고급 옵션',
  'codex.skipGitRepoCheckWarning':
    '워크플로우 실행 시 일반적으로 이 옵션이 필요합니다. 신뢰할 수 있는 Git 리포지토리 외부에서 실행을 허용합니다.',
  'codex.createButton': '생성',
  'codex.cancelButton': '취소',
  'codex.error.nameRequired': '이름이 필요합니다',
  'codex.error.nameTooLong': '이름은 64자 이내로 입력하세요',
  'codex.error.nameInvalidPattern': '이름은 영숫자, 하이픈, 밑줄만 사용할 수 있습니다',
  'codex.error.promptRequired': '프롬프트가 필요합니다',
  'codex.error.promptTooLong': '프롬프트는 10,000자 이내로 입력하세요',
  'codex.error.modelRequired': '모델 이름이 필요합니다',
  'codex.nameHelp': '영숫자, 하이픈, 밑줄만 사용 가능',

  // SubAgentFlow Node (Feature: 089-subworkflow)
  'node.subAgentFlow.title': 'Sub-Agent Flow',
  'node.subAgentFlow.description': 'Sub-Agent를 세부적으로 제어하여 실행',
  'node.subAgentFlow.linked': '연결됨',
  'node.subAgentFlow.notLinked': '연결 안 됨',
  'node.subAgentFlow.untitled': '제목 없는 서브 에이전트 플로우',
  'node.subAgentFlow.subAgentFlowNotFound': '서브 에이전트 플로우를 찾을 수 없음',
  'node.subAgentFlow.selectSubAgentFlow': '실행할 서브 에이전트 플로우 선택',

  // SubAgentFlow Panel (Feature: 089-subworkflow)
  'subAgentFlow.panel.title': '서브 에이전트 플로우',
  'subAgentFlow.create': '새로 만들기',
  'subAgentFlow.delete': '삭제',
  'subAgentFlow.mainWorkflow': '메인 워크플로우',
  'subAgentFlow.empty': '서브 에이전트 플로우가 없습니다',
  'subAgentFlow.default.name': 'subagentflow',
  'subAgentFlow.editing': '편집 중:',
  'subAgentFlow.edit': 'Sub-Agent Flow 편집',
  'subAgentFlow.clickToEdit': '클릭하여 이름 편집',
  'subAgentFlow.namePlaceholder': '예: data-processing',
  'subAgentFlow.dialog.close': '닫고 메인 워크플로우로 돌아가기',
  'subAgentFlow.dialog.submit': '확정하고 워크플로우에 추가',
  'subAgentFlow.dialog.cancel': '취소하고 변경 사항 삭제',
  'subAgentFlow.generateNameWithAI': 'AI로 이름 생성',

  // SubAgentFlow AI Edit
  'subAgentFlow.aiEdit.title': 'AI 편집',
  'subAgentFlow.aiEdit.toggleButton': 'AI 편집 모드 전환',

  // SubAgentFlow validation errors
  'error.subAgentFlow.nameRequired': '이름은 필수입니다',
  'error.subAgentFlow.nameTooLong': '이름은 50자 이하여야 합니다',
  'error.subAgentFlow.invalidName':
    '이름은 영문 소문자(a-z), 숫자, 하이픈, 밑줄만 사용할 수 있습니다',

  // Quick start instructions
  'palette.nestedNotAllowed': '서브 에이전트 플로우에서 사용할 수 없습니다 (중첩 미지원)',
  'palette.instruction.addNode': '노드를 클릭하여 캔버스에 추가',
  'palette.instruction.dragNode': '노드를 드래그하여 재배치',
  'palette.instruction.connectNodes': '출력에서 입력 핸들로 드래그하여 연결',
  'palette.instruction.editProperties': '노드를 선택하여 속성 편집',

  // Property Panel
  'property.title': '속성',

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
  'property.memory': '메모리',
  'property.memory.referenceUrl': 'https://code.claude.com/docs/ko/sub-agents#지속적-메모리-활성화',
  'properties.subAgent.color': '색상',
  'properties.subAgent.colorPlaceholder': '색상 선택...',
  'properties.subAgent.colorNone': '없음',
  'properties.subAgent.colorHelp': '이 서브 에이전트의 시각적 식별 색상',

  // Skill properties
  'property.skillPath': 'Skill 경로',
  'property.scope': '범위',
  'property.scope.user': '사용자',
  'property.scope.project': '프로젝트',
  'property.scope.local': '로컬',
  // Legacy key for backward compatibility
  'property.scope.personal': '개인',
  'property.validationStatus': '검증 상태',
  'property.validationStatus.valid': '유효함',
  'property.validationStatus.missing': '찾을 수 없음',
  'property.validationStatus.invalid': '유효하지 않음',
  'property.validationStatus.valid.tooltip': 'Skill이 유효하며 사용할 수 있습니다',
  'property.validationStatus.missing.tooltip': '지정된 경로에서 SKILL.md 파일을 찾을 수 없습니다',
  'property.validationStatus.invalid.tooltip':
    'SKILL.md에 유효하지 않은 YAML frontmatter가 있습니다',
  'property.allowedTools': '허용된 도구',

  // Codex Agent properties

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
  'property.prompt.label': '프롬프트',
  'property.prompt.placeholder': '{{variables}}를 포함하는 프롬프트 입력',
  'property.prompt.help': '동적 값에는 {{variableName}} 구문 사용',
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
  'default.prompt':
    '여기에 프롬프트를 입력하세요.\n\n{{variableName}}과 같이 변수를 사용할 수 있습니다.',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '조건이 참일 때',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '조건이 거짓일 때',
  'default.case1': 'Case 1',
  'default.case1Condition': '조건 1이 충족될 때',
  'default.case2': 'Case 2',
  'default.case2Condition': '조건 2가 충족될 때',
  'default.defaultBranch': 'default',
  'default.defaultBranchCondition': '기타',
  'default.conditionPrefix': '조건 ',
  'default.conditionSuffix': '이 충족될 때',

  // Tour
  'tour.welcome':
    'CC Workflow Studio에 오신 것을 환영합니다!\n\n이 투어에서는 주요 기능의 위치와 역할을 소개합니다. 첫 워크플로우를 만들기 전에 기본 사항을 익혀보세요.',
  'tour.nodePalette':
    '노드 팔레트에는 워크플로우에서 사용할 수 있는 다양한 노드가 있습니다.\n\nPrompt, Sub-Agent, AskUserQuestion, If/Else, Switch 등의 노드를 클릭하여 캔버스에 추가할 수 있습니다.',
  'tour.addPrompt':
    '이 "Prompt" 버튼으로 캔버스에 Prompt 노드를 추가할 수 있습니다.\n\nPrompt 노드는 변수를 지원하는 템플릿으로 워크플로우의 기본 구성 요소입니다.',
  'tour.addSubAgent':
    '"Sub-Agent" 노드는 특정 작업을 실행하는 전문 에이전트입니다.\n\n프롬프트와 도구 제한을 설정하여 단일 책임을 가진 에이전트를 만들 수 있습니다.',
  'tour.addSubAgentFlow':
    '"Sub-Agent Flow"는 복잡한 Sub-Agent 처리 흐름을 시각적으로 정의할 수 있습니다.\n\nMCP나 Skill을 병렬로 실행하려면 각 처리를 Sub-Agent Flow에 포함하고 해당 Sub-Agent Flow들을 병렬로 실행하는 흐름을 만들면 됩니다.',
  'tour.addSkill':
    '"Skill" 노드는 Claude Code 스킬을 호출합니다.\n\n개인용(~/.claude/skills/) 또는 프로젝트용(.claude/skills/) 스킬을 선택하여 실행할 수 있습니다.',
  'tour.addMcp':
    '"MCP Tool" 노드는 MCP 서버 도구를 실행합니다.\n\n외부 서비스 연동이나 커스텀 도구 호출에 사용할 수 있습니다.',
  'tour.addAskUserQuestion':
    '"AskUserQuestion" 노드는 사용자 선택에 따라 워크플로우를 분기하는 데 사용됩니다.\n\n이 버튼으로 캔버스에 추가할 수 있습니다.',
  'tour.addEnd':
    '"End" 노드는 워크플로우의 종료 지점을 나타냅니다.\n\n여러 End 노드를 배치하여 결과에 따른 다른 종료 지점을 설정할 수 있습니다.',
  'tour.addIfElse':
    '"If/Else" 노드는 조건에 따라 워크플로우를 두 방향으로 분기합니다.\n\n참(True) 또는 거짓(False) 조건을 설정하여 처리 흐름을 제어할 수 있습니다.',
  'tour.addSwitch':
    '"Switch" 노드는 여러 조건에 따라 워크플로우를 다방향으로 분기합니다.\n\n여러 케이스와 기본 케이스를 설정하여 복잡한 분기 로직을 구현할 수 있습니다.',
  'tour.canvas':
    '여기가 캔버스입니다. 노드를 드래그하여 위치를 조정하고 핸들을 드래그하여 노드를 연결할 수 있습니다.\n\n시작 및 종료 노드가 이미 배치되어 있습니다.',
  'tour.propertyPanel':
    '속성 패널에서 선택한 노드를 구성할 수 있습니다.\n\n노드 이름, 프롬프트, 모델 선택 등을 편집할 수 있습니다.',
  'tour.connectNodes':
    '노드를 연결하여 워크플로우를 만드세요.\n\n노드 오른쪽의 출력 핸들(⚪)에서 다른 노드 왼쪽의 입력 핸들로 드래그하세요.',
  'tour.workflowName':
    '여기에서 워크플로우에 이름을 지정할 수 있습니다.\n\n문자, 숫자, 하이픈 및 밑줄을 사용할 수 있습니다.',
  'tour.saveWorkflow':
    '"저장" 버튼을 클릭하면 워크플로우가 `.vscode/workflows/` 디렉터리에 JSON으로 저장됩니다.\n\n나중에 로드하여 계속 편집할 수 있습니다.',
  'tour.loadWorkflow':
    '저장된 워크플로우를 로드하려면 드롭다운 메뉴에서 워크플로우를 선택하고 "불러오기" 버튼을 클릭하세요.',
  'tour.exportWorkflow':
    '"Convert" 버튼을 클릭하면 워크플로우를 Slash Command 형식으로 변환합니다.\n\n변환된 파일은 .claude/commands/ 디렉토리에 저장됩니다.',
  'tour.runSlashCommand':
    '"Run" 버튼을 클릭하면 워크플로우를 Slash Command로 변환하고 즉시 Claude Code에서 실행합니다.\n\n변환과 실행을 한 번에 수행합니다.',
  'tour.refineWithAI':
    '"AI로 편집" 버튼을 사용하여 AI와 대화하며 워크플로우를 생성하거나 개선할 수 있습니다.\n\n빈 캔버스에서 시작하거나 기존 워크플로우를 대화형으로 수정할 수 있습니다.',
  'tour.moreActions':
    '"더보기" 메뉴에서 추가 작업을 사용할 수 있습니다:<br><br>• Slack에 공유 - 팀과 워크플로우 공유<br>• 초기화 - 캔버스 지우기<br>• 도움말 - 이 투어 다시 보기<br><br>워크플로우 생성을 즐기세요!',

  // Tour buttons
  'tour.button.back': '뒤로',
  'tour.button.close': '닫기',
  'tour.button.finish': '완료',
  'tour.button.next': '다음',
  'tour.button.skip': '건너뛰기',

  // Terms of Use
  'terms.title': 'CC Workflow Studio - 이용 약관',
  'terms.introduction': '이 도구는 정당한 목적의 워크플로우 생성을 지원합니다.',
  'terms.prohibitedUse': '다음 용도로 사용을 금지합니다:',
  'terms.cyberAttack': '사이버 공격 (DDoS 공격, 무단 접근 등)',
  'terms.malware': '악성 코드 및 랜섬웨어 제작',
  'terms.personalDataTheft': '개인 정보의 무단 수집 또는 오용',
  'terms.otherIllegalActs': '기타 불법 행위 또는 타인에게 해를 끼치는 행위',
  'terms.apiKeyLiabilityHeading': 'API 사용에 대하여 (추가)',
  'terms.apiKeyLiability':
    'Claude API 연동 기능을 사용할 경우, API 키 관리 및 API 사용으로 발생하는 비용은 사용자의 자기 책임입니다.',
  'terms.liability':
    '본 도구의 사용으로 인한 위반 행위 또는 손해에 대해 사용자가 전적으로 책임을 집니다.',
  'terms.agree': '위 내용에 동의합니다',
  'terms.agreeButton': '동의하고 시작',
  'terms.cancelButton': '취소',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '노드 삭제',
  'dialog.deleteNode.message': '이 노드를 삭제하시겠습니까?',
  'dialog.deleteNode.confirm': '삭제',
  'dialog.deleteNode.cancel': '취소',

  // Load Workflow Confirmation Dialog (when opening from preview with unsaved changes)
  'dialog.loadWorkflow.title': '저장되지 않은 변경 사항',
  'dialog.loadWorkflow.message':
    '저장되지 않은 변경 사항이 있습니다. 새 워크플로를 로드하면 변경 사항이 손실됩니다. 계속하시겠습니까?',
  'dialog.loadWorkflow.confirm': '삭제 후 로드',
  'dialog.loadWorkflow.cancel': '취소',

  // Diff Preview Dialog (MCP apply_workflow)
  'dialog.diffPreview.title': '워크플로우 변경 검토',
  'dialog.diffPreview.description': 'AI 에이전트가 워크플로우에 다음 변경을 적용하려고 합니다:',
  'dialog.diffPreview.newWorkflow': 'AI 에이전트가 새 워크플로우를 생성하려고 합니다:',
  'dialog.diffPreview.nameChange': '이름:',
  'dialog.diffPreview.nodes': '노드',
  'dialog.diffPreview.connections': '연결',
  'dialog.diffPreview.connectionsAdded': '추가',
  'dialog.diffPreview.connectionsRemoved': '삭제',
  'dialog.diffPreview.noChanges': '변경 사항이 없습니다.',
  'dialog.diffPreview.agentDescription': '에이전트 설명',
  'dialog.diffPreview.accept': '적용',
  'dialog.diffPreview.reject': '거부',

  // Reset Workflow Confirmation Dialog
  'toolbar.resetWorkflow': '워크플로우 초기화',
  'toolbar.focusMode': '집중 모드',
  'dialog.resetWorkflow.title': '워크플로우 초기화',
  'dialog.resetWorkflow.message':
    '워크플로우를 초기화하시겠습니까? Start와 End를 제외한 모든 노드가 삭제됩니다.',
  'dialog.resetWorkflow.confirm': '초기화',

  // Skill Browser Dialog
  'skill.browser.title': 'Skill 탐색',
  'skill.browser.description':
    '워크플로에 추가할 Claude Code Skill을 선택하세요.\nSkill은 Claude Code가 자동으로 활용하는 전문적인 능력입니다.',
  'skill.browser.userTab': '사용자',
  'skill.browser.projectTab': '프로젝트',
  'skill.browser.localTab': '로컬',
  // Scope descriptions for beginners
  'skill.browser.userDescription': '모든 프로젝트에서 사용 가능.',
  'skill.browser.projectDescription': '이 프로젝트에서만 사용 가능 (공유용).',
  'skill.browser.localDescription': '이 프로젝트에서만 사용 가능 (개인용).',
  'skill.browser.filterPlaceholder': 'Skill 이름으로 필터...',
  // Legacy key for backward compatibility
  'skill.browser.personalTab': '개인',
  'skill.browser.noSkills': '이 디렉터리에서 Skill을 찾을 수 없습니다',
  'skill.browser.loading': 'Skill 로드 중...',
  'skill.browser.selectButton': '워크플로에 추가',
  'skill.browser.cancelButton': '취소',
  'skill.browser.skillName': 'Skill 이름',
  'skill.browser.skillDescription': '설명',
  'skill.browser.skillPath': '경로',
  'skill.browser.validationStatus': '상태',

  // Skill Browser Settings Step
  'skill.browser.configureButton': '설정으로',
  'skill.browser.addButton': '워크플로우에 추가',
  'skill.browser.backToList': '뒤로',

  // Skill Browser Actions
  'skill.action.refresh': '새로고침',
  'skill.refreshing': '새로고침 중...',

  // Skill Browser Errors
  'skill.error.loadFailed': 'Skill을 로드하지 못했습니다. Skill 디렉터리를 확인하세요.',
  'skill.error.noSelection': 'Skill을 선택하세요',
  'skill.error.unknown': '예기치 않은 오류가 발생했습니다',
  'skill.error.refreshFailed': 'Skill 새로고침에 실패했습니다',

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
  'skill.creation.scopeUser': '사용자 (~/.claude/skills/)',
  'skill.creation.scopeProject': '프로젝트용 (.claude/skills/)',
  // Legacy key for backward compatibility
  'skill.creation.scopePersonal': '개인용 (~/.claude/skills/)',
  'skill.creation.cancelButton': '취소',
  'skill.creation.createButton': '스킬 만들기',
  'skill.creation.creatingButton': '만드는 중...',
  'skill.creation.error.unknown': '스킬 생성에 실패했습니다. 다시 시도해 주세요.',

  // Skill Execution Mode
  'property.skill.executionMode': '실행 모드',
  'property.skill.executionMode.execute': '실행',
  'property.skill.executionMode.load': '지식으로 로드',
  'property.skill.executionMode.execute.description': '워크플로우에서 스킬을 액션으로 실행합니다',
  'property.skill.executionMode.load.description':
    '스킬 내용을 지식 컨텍스트로 로드합니다 (실행하지 않음)',
  'property.skill.executionPrompt': '프롬프트',
  'property.skill.executionPrompt.placeholder': '이 스킬을 실행할 때의 추가 지침을 입력하세요...',

  // Skill Edit Dialog
  'skill.editDialog.title': '스킬 설정 편집',
  'skill.editDialog.saveButton': '저장',
  'skill.editDialog.cancelButton': '취소',

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
  'refinement.chat.useSkillsCheckbox': 'Skill 포함',
  'refinement.chat.useCodexNodesCheckbox': 'Codex Agent 노드 포함',

  // Timeout selector
  'refinement.timeout.label': '타임아웃',
  'refinement.timeout.ariaLabel': 'AI 리파인먼트 타임아웃 시간 선택',

  // Model selector
  'refinement.model.label': '모델',

  // Provider selector
  'refinement.provider.label': 'AI 프로바이더',

  // Settings dropdown
  'refinement.settings.title': '설정',

  'refinement.chat.claudeMdTip':
    '💡 팁: CLAUDE.md 에 워크플로별 규칙과 제약을 추가하면AI가 더 정확한 편집을 수행합니다',
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

  // Refinement Success Messages
  'refinement.success.defaultMessage': '워크플로를 편집했습니다.',

  // Refinement Session Status
  'refinement.session.warningDialog.title': 'AI 편집 세션이 재연결되었습니다',
  'refinement.session.warningDialog.message':
    'AI 프로바이더 전환, 다른 사용자가 공유한 워크플로우 불러오기, 세션 만료 등의 이유로 AI 대화 세션을 계속할 수 없어 새 대화 세션을 시작했습니다.\n\n이전 대화 세션에서 AI가 기억하고 있던 추가 컨텍스트(파일 내용, 도구 실행 결과 등)는 손실되었을 수 있습니다.\n\n필요한 경우 관련 정보를 메시지로 다시 전달해 주세요.',
  'refinement.session.warningDialog.ok': 'OK',

  // Refinement Errors
  'refinement.error.emptyMessage': '메시지를 입력하세요',
  'refinement.error.messageTooLong': '메시지가 너무 깁니다 (최대 {max}자)',
  'refinement.error.commandNotFound':
    'Claude Code CLI를 찾을 수 없습니다. AI 개선 기능을 사용하려면 Claude Code를 설치하세요.',
  'refinement.error.modelNotSupported':
    '선택한 모델이 지원되지 않거나 액세스가 활성화되어 있지 않습니다. Copilot Chat에서 해당 모델을 선택하고 한 번 사용하면 액세스 권한을 활성화할 수 있습니다.',
  'refinement.error.copilotNotAvailable':
    'Copilot을 사용할 수 없습니다. VS Code 1.89 이상과 GitHub Copilot 확장 프로그램이 설치되어 있는지 확인하세요.',
  'refinement.error.timeout':
    'AI 개선 시간이 초과되었습니다. 타임아웃 설정값을 조정하고 다시 시도해 보세요. 요청 내용을 단순화하는 것도 권장됩니다.',
  'refinement.error.parseError':
    'AI 응답 파싱에 실패했습니다. 다시 시도하거나 요청을 다시 표현하세요.',
  'refinement.error.validationError':
    '개선된 워크플로가 검증에 실패했습니다. 다른 요청을 시도하세요.',
  'refinement.error.prohibitedNodeType':
    'SubAgent, SubAgentFlow, AskUserQuestion 노드는 서브 에이전트 플로우에서 사용할 수 없습니다.',
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
  // Provider-specific notes
  'refinement.initialMessage.noteClaudeCode': '※ 이 기능은 Claude Code를 사용합니다.',
  'refinement.initialMessage.noteCodex': '※ 이 기능은 Codex CLI를 사용합니다.',
  // Copilot-specific note with link
  'refinement.initialMessage.noteCopilot':
    '※ 이 기능은 VSCode Language Model API를 통해 GitHub Copilot에 요청합니다.',

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': 'MCP 도구 실행',

  // MCP Server List
  'mcp.loading.servers': '이 프로젝트에서 사용 가능한 MCP 서버 로드 중...',
  'mcp.error.serverLoadFailed': 'MCP 서버 로드 실패',
  'mcp.empty.servers': '이 프로젝트에서 사용 가능한 MCP 서버가 없습니다.',
  'mcp.empty.servers.hint': 'Claude Code용 MCP 서버를 설정하세요.',

  // MCP Tool List
  'mcp.loading.tools': '도구 로드 중...',
  'mcp.error.toolLoadFailed': '서버에서 도구 로드 실패',
  'mcp.empty.tools': '이 서버에서 사용할 수 있는 도구가 없습니다',

  // MCP Cache Actions
  'mcp.action.refresh': '새로 고침',
  'mcp.refreshing': '새로 고침 중...',
  'mcp.error.refreshFailed': 'MCP 캐시 새로 고침에 실패했습니다',

  // MCP Tool Search
  'mcp.search.placeholder': '이름이나 설명으로 도구 검색...',
  'mcp.search.noResults': '"{query}"와 일치하는 도구를 찾을 수 없습니다',
  'mcp.search.serverPlaceholder': '서버 이름으로 필터...',
  'mcp.search.noServers': '"{query}"와 일치하는 서버를 찾을 수 없습니다',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Tool 설정',
  'mcp.dialog.selectServer': 'MCP 서버 선택',
  'mcp.dialog.selectTool': '도구 선택',
  'mcp.dialog.addButton': '도구 추가',
  'mcp.dialog.cancelButton': '취소',
  'mcp.dialog.nextButton': '다음',
  'mcp.dialog.backButton': '뒤로',
  'mcp.dialog.saveButton': '노드 생성',
  'mcp.dialog.error.noServerSelected': 'MCP 서버를 선택하세요',
  'mcp.dialog.error.noToolSelected': '도구를 선택하세요',
  'mcp.dialog.error.incompleteWizard': '필수 단계를 모두 완료하세요',
  'mcp.dialog.error.cannotProceed': '계속하려면 모든 필수 필드를 입력하세요',
  'mcp.dialog.error.invalidMode': '잘못된 모드가 선택되었습니다',

  // MCP Property Panel
  'property.mcp.serverId': '서버',
  'property.mcp.toolName': '도구 이름',
  'property.mcp.toolDescription': '설명',
  'property.mcp.parameters': '매개변수',
  'property.mcp.parameterValues': '매개변수 값',
  'property.mcp.parameterCount': '매개변수 개수',
  'property.mcp.editParameters': '매개변수 편집',
  'property.mcp.edit.manualParameterConfig': '매개변수 편집',
  'property.mcp.edit.aiParameterConfig': '매개변수 내용 편집',
  'property.mcp.edit.aiToolSelection': '작업 내용 편집',
  'property.mcp.taskDescription': '작업 내용',
  'property.mcp.parameterDescription': '매개변수 내용',
  'property.mcp.configuredValues': '구성된 값',
  'property.mcp.infoNote':
    'MCP 도구 속성은 서버에서 로드됩니다. "매개변수 편집"을 클릭하여 매개변수 값을 구성하세요.',

  // MCP Parameter Form
  'mcp.parameter.formTitle': '도구 매개변수',
  'mcp.parameter.noParameters': '이 도구에는 매개변수가 없습니다',
  'mcp.parameter.selectOption': '-- 옵션 선택 --',
  'mcp.parameter.enterValue': '값 입력',
  'mcp.parameter.minLength': '최소 길이',
  'mcp.parameter.maxLength': '최대 길이',
  'mcp.parameter.pattern': '패턴',
  'mcp.parameter.minimum': '최소값',
  'mcp.parameter.maximum': '최대값',
  'mcp.parameter.default': '기본값',
  'mcp.parameter.addItem': '항목 추가',
  'mcp.parameter.add': '추가',
  'mcp.parameter.remove': '제거',
  'mcp.parameter.arrayCount': '항목',
  'mcp.parameter.jsonFormat': 'JSON 형식이 필요합니다',
  'mcp.parameter.jsonInvalid': '잘못된 JSON 형식입니다',
  'mcp.parameter.objectInvalid': '값은 JSON 객체여야 합니다',
  'mcp.parameter.unsupportedType': '지원되지 않는 매개변수 유형: {name}의 {type}',
  'mcp.parameter.validationErrors': '다음 검증 오류를 수정하세요:',

  // MCP Edit Dialog
  'mcp.editDialog.title': 'MCP 도구 구성',
  'mcp.editDialog.saveButton': '저장',
  'mcp.editDialog.cancelButton': '취소',
  'mcp.editDialog.loading': '도구 스키마 로드 중...',
  'mcp.editDialog.error.schemaLoadFailed': '도구 스키마 로드 실패',

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': '구성 모드 선택',
  'mcp.modeSelection.subtitle': 'MCP 도구 구성 방법을 선택하세요',
  'mcp.modeSelection.manualParameterConfig.title': '수동 매개변수 설정',
  'mcp.modeSelection.manualParameterConfig.description':
    'MCP 서버, MCP 도구 및 모든 매개변수를 명시적으로 구성합니다. 재현성이 높으며 기술 사용자에게 적합합니다.',
  'mcp.modeSelection.aiParameterConfig.title': 'AI 매개변수 설정',
  'mcp.modeSelection.aiParameterConfig.description':
    'MCP 서버와 MCP 도구를 선택하고 매개변수를 자연어로 설명합니다. 균형잡힌 접근 방식입니다.',
  'mcp.modeSelection.aiToolSelection.title': 'AI 도구 선택',
  'mcp.modeSelection.aiToolSelection.description':
    'MCP 서버만 선택하고 전체 작업을 자연어로 설명합니다. 가장 간단하지만 재현성은 낮습니다.',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': '도구 매개변수 구성',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': '매개변수 내용',
  'mcp.naturalLanguage.paramDescription.placeholder':
    '이 도구로 수행하려는 작업을 설명하세요(예: "us-east-1에서 Lambda를 사용할 수 있는지 확인")...',
  'mcp.naturalLanguage.taskDescription.label': '작업 내용',
  'mcp.naturalLanguage.taskDescription.placeholder':
    '수행하려는 작업을 설명하세요(예: "S3 버킷 정책에 대한 문서 찾기")...',

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': '모드 전환 경고',
  'mcp.modeSwitch.warning.message':
    '{currentMode}에서 {newMode}로 전환하면 이 노드의 구성 방법이 변경됩니다. 현재 구성은 보존되지만 새 모드에서는 표시되지 않을 수 있습니다. 언제든지 {currentMode}로 돌아가 이전 구성을 복원할 수 있습니다.',
  'mcp.modeSwitch.warning.continueButton': '계속',
  'mcp.modeSwitch.warning.cancelButton': '취소',
  'mcp.modeSwitch.dataPreserved': '데이터는 보존됩니다',
  'mcp.modeSwitch.canRevert': '언제든지 되돌릴 수 있습니다',

  // Validation Errors
  'mcp.error.paramDescRequired': '매개변수 설명을 입력하세요.',
  'mcp.error.taskDescRequired': '작업 설명을 입력하세요.',
  'mcp.error.noToolsAvailable': '선택한 MCP 서버에서 사용 가능한 도구가 없습니다',
  'mcp.error.toolListOutdated':
    '도구 목록 스냅샷이 7일 이상 오래되었습니다. 최신 도구를 가져오려면 이 노드를 다시 편집하세요.',
  'mcp.error.modeConfigMissing': '모드 구성이 누락되었습니다. 이 노드를 다시 구성하세요.',
  'mcp.error.invalidModeConfig':
    '모드 구성이 잘못되었습니다. 자연어 설명을 확인하거나 상세 모드로 전환하세요.',

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': '상세 모드: 모든 매개변수가 명시적으로 구성됨',
  'mcp.mode.naturalLanguageParam.tooltip': '자연어 매개변수 모드: "{description}"',
  'mcp.mode.fullNaturalLanguage.tooltip': '완전 자연어 모드: "{taskDescription}"',

  // Slack Integration
  'slack.connect': 'Slack에 연결',
  'slack.disconnect': '연결 해제',
  'slack.connecting': '연결 중...',
  'slack.connected': '{workspaceName}에 연결됨',
  'slack.notConnected': 'Slack에 연결되지 않음',

  // Slack Manual Token
  'slack.manualToken.title': 'Slack에 연결',
  'slack.manualToken.description': '직접 만든 Slack 앱을 통해 워크스페이스에 연결합니다.',
  'slack.manualToken.howToGet.title': 'Slack App 설정 방법',
  'slack.manualToken.howToGet.step1': 'Slack App 생성 (api.slack.com/apps)',
  'slack.manualToken.howToGet.step2': 'User Token Scopes 추가 (OAuth & Permissions):',
  'slack.manualToken.howToGet.step3': '워크스페이스에 App 설치 (OAuth & Permissions)',
  'slack.manualToken.howToGet.step4': 'OAuth & Permissions 페이지에서 User Token (xoxp-...) 복사',
  'slack.manualToken.security.title': '보안 및 개인정보',
  'slack.manualToken.security.notice':
    '참고: 이 기능은 Slack 서버와 통신합니다 (로컬 전용 작업 아님)',
  'slack.manualToken.security.storage':
    '토큰은 VSCode Secret Storage (OS 키체인)에 안전하게 저장됩니다',
  'slack.manualToken.security.transmission': 'Slack API (api.slack.com)로만 검증을 위해 전송됩니다',
  'slack.manualToken.security.deletion': '언제든지 삭제할 수 있습니다',
  'slack.manualToken.security.sharing':
    'User Token에는 채널 읽기/쓰기 등의 권한이 있습니다. 신뢰할 수 있는 커뮤니티 내에서만 공유하세요.',
  'slack.manualToken.userToken.label': 'User OAuth Token',
  'slack.manualToken.error.tokenRequired': 'User Token은 필수입니다',
  'slack.manualToken.error.invalidTokenFormat': 'User Token은 "xoxp-"로 시작해야 합니다',
  'slack.manualToken.error.userTokenRequired': '보안 채널 목록을 위해 User Token이 필요합니다',
  'slack.manualToken.error.invalidUserTokenFormat': 'User Token은 "xoxp-"로 시작해야 합니다',
  'slack.manualToken.connecting': '연결 중...',
  'slack.manualToken.connect': '연결',
  'slack.manualToken.deleteButton': '저장된 인증 토큰 삭제',
  'slack.manualToken.deleteConfirm.title': '토큰 삭제',
  'slack.manualToken.deleteConfirm.message': '저장된 인증 토큰을 삭제하시겠습니까?',
  'slack.manualToken.deleteConfirm.confirm': '삭제',
  'slack.manualToken.deleteConfirm.cancel': '취소',

  // Slack Share
  'slack.share.button': '공유',
  'slack.share.title': 'Slack에 공유',
  'slack.share.selectChannel': '채널 선택',
  'slack.share.selectChannelPlaceholder': '채널을 선택하세요...',
  'slack.share.sharing': '공유 중...',
  'slack.share.failed': '워크플로우 공유에 실패했습니다',

  // Slack Description AI Generation
  'slack.description.generateFailed':
    '설명 생성에 실패했습니다. 다시 시도하거나 직접 작성해 주세요.',

  // Slack Connect
  'slack.connect.button': 'Slack에 연결',
  'slack.connect.connecting': '연결 중...',
  'slack.connect.description': 'Slack 워크스페이스에 연결하여 팀과 워크플로우를 공유하세요.',
  'slack.connect.success': '{workspaceName}에 연결되었습니다',
  'slack.connect.failed': 'Slack 연결에 실패했습니다',
  'slack.connect.title': 'Slack에 연결',
  'slack.connect.tab.oauth': 'Slack App을 워크스페이스에 연결',
  'slack.connect.tab.manual': '자체 Slack 앱으로 연결',

  // Slack OAuth
  'slack.oauth.description':
    '워크스페이스에 연결 버튼을 클릭하면 "CC Workflow Studio"가 Slack에 액세스할 수 있도록 허용하는 확인 화면이 표시됩니다.\n허용하면 워크스페이스에 연동용 Slack App이 설치됩니다.',
  'slack.oauth.termsOfService': '이용약관',
  'slack.oauth.privacyPolicy': '개인정보처리방침',
  'slack.oauth.supportPage': '지원 페이지',
  'slack.oauth.connectButton': '워크스페이스에 연결',
  'slack.oauth.status.initiated': '브라우저를 열어 인증 중...',
  'slack.oauth.status.polling': '인증 대기 중...',
  'slack.oauth.status.waitingHint': '브라우저에서 인증을 완료한 후 여기로 돌아오세요.',
  'slack.oauth.cancelled': '인증이 취소되었습니다',
  'slack.oauth.reviewNotice.message':
    '이 Slack 앱은 Slack Marketplace에 제출되지 않았습니다.\n권한 화면에 경고가 표시됩니다.',

  // Slack Reconnect
  'slack.reconnect.button': 'Reconnect to Slack',
  'slack.reconnect.reconnecting': 'Reconnecting...',
  'slack.reconnect.description':
    'Re-authenticate with Slack to update permissions or refresh connection.',
  'slack.reconnect.success': 'Successfully reconnected to {workspaceName}',
  'slack.reconnect.failed': 'Failed to reconnect to Slack',

  // Slack Import
  'slack.import.title': 'Slack에서 가져오기',
  'slack.import.importing': '가져오는 중...',
  'slack.import.success': '워크플로우를 가져왔습니다',
  'slack.import.failed': '워크플로우 가져오기에 실패했습니다',
  'slack.import.confirmOverwrite': '같은 이름의 워크플로우가 이미 존재합니다. 덮어쓰시겠습니까?',

  // Slack Search
  'slack.search.title': '워크플로우 검색',
  'slack.search.placeholder': '이름, 작성자 또는 채널로 검색...',
  'slack.search.searching': '검색 중...',
  'slack.search.noResults': '워크플로우를 찾을 수 없습니다',

  // Slack Scopes - reasons why each scope is required
  'slack.scopes.chatWrite.reason': '워크플로우 공유용',
  'slack.scopes.filesRead.reason': '워크플로우 가져오기용',
  'slack.scopes.filesWrite.reason': '워크플로우 파일 첨부용',
  'slack.scopes.channelsRead.reason': '공유 대상 채널 선택용',
  'slack.scopes.groupsRead.reason': '비공개 채널 선택용',

  // Slack Errors
  'slack.error.channelNotFound': '채널을 찾을 수 없습니다',
  'slack.error.notInChannel': '공유 대상 채널에 Slack 앱이 추가되지 않았습니다.',
  'slack.error.networkError': '네트워크 오류가 발생했습니다. 연결을 확인하세요.',
  'slack.error.rateLimited': '요청 한도를 초과했습니다. {seconds}초 후에 다시 시도하세요.',
  'slack.error.noWorkspaces': '연결된 워크스페이스가 없습니다',
  'slack.error.noChannels': '사용 가능한 채널이 없습니다',
  'slack.error.invalidAuth': 'Slack 토큰이 유효하지 않습니다.',
  'slack.error.missingScope': '필요한 권한이 없습니다.',
  'slack.error.fileTooLarge': '파일 크기가 너무 큽니다.',
  'slack.error.invalidFileType': '지원되지 않는 파일 형식입니다.',
  'slack.error.internalError': 'Slack 내부 오류가 발생했습니다.',
  'slack.error.notAuthed': '인증 정보가 제공되지 않았습니다.',
  'slack.error.invalidCode': '인증 코드가 유효하지 않거나 만료되었습니다.',
  'slack.error.badClientSecret': '클라이언트 시크릿이 유효하지 않습니다.',
  'slack.error.invalidGrantType': '유효하지 않은 인증 유형입니다.',
  'slack.error.accountInactive': '계정이 비활성화되었습니다.',
  'slack.error.invalidQuery': '유효하지 않은 검색 쿼리입니다.',
  'slack.error.msgTooLong': '메시지가 너무 깁니다.',
  'slack.error.workspaceNotConnected': '원본 Slack 워크스페이스에 연결되어 있지 않습니다.',
  'slack.error.unknownError': '알 수 없는 오류가 발생했습니다.',
  'slack.error.unknownApiError': 'Slack API 오류가 발생했습니다.',

  // Sensitive Data Warning
  'slack.sensitiveData.warning.title': '민감한 데이터 감지됨',
  'slack.sensitiveData.warning.message':
    '워크플로우에서 다음과 같은 민감한 데이터가 감지되었습니다:',
  'slack.sensitiveData.warning.continue': '그래도 공유',
  'slack.sensitiveData.warning.cancel': '취소',

  // Slack Import Connection Required Dialog
  'slack.import.connectionRequired.title': 'Slack 연결이 필요합니다',
  'slack.import.connectionRequired.message':
    '이 워크플로우를 가져오려면 원본 Slack 워크스페이스에 연결해야 합니다. 워크플로우 파일이 현재 연결되지 않은 워크스페이스에 있습니다.',
  'slack.import.connectionRequired.workspaceInfo': '원본 워크스페이스:',
  'slack.import.connectionRequired.connectButton': 'Slack에 연결',

  // Edit in VSCode Editor
  'editor.openInEditor': '에디터에서 편집',
  'editor.openInEditor.tooltip': 'VSCode 에디터에서 열어 전체 편집 기능 사용',

  // Workflow Settings / Memo Panel
  'workflow.settings.title': '워크플로우 설정',
  'workflow.settings.description.label': '설명',
  'workflow.settings.description.placeholder':
    '이 워크플로우에 대한 설명을 입력하세요 (예: 무엇을 하는지, 언제 사용하는지)...',
  'workflow.settings.generateWithAI': 'AI로 생성',

  // MCP Server Section
  'mcpSection.description.line1': 'AI와 대화 형식으로 워크플로우를 편집합니다.',
  'mcpSection.description.line2': '사용할 에이전트를 선택하세요.',
  'mcpSection.reviewBeforeApply': '적용 전 변경사항 확인',

  // Description Panel (Canvas)
  'description.panel.title': '설명',
  'description.panel.show': '설명 패널 표시',
  'description.panel.hide': '설명 패널 숨기기',

  // Claude API Upload Dialog
  'claudeApi.description':
    '워크플로우를 Agent Skills로 Claude API에 업로드하고 Messages API를 통해 실행할 수 있습니다.\nMCP 서버, 코드 실행, 기타 스킬과 결합하여 문서 처리, 데이터 분석, 고객 지원 등 전문 AI 에이전트를 API로 공개할 수 있습니다.',
};
