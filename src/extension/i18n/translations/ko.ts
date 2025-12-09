/**
 * Claude Code Workflow Studio - Korean Translations
 */

import type { TranslationKeys } from '../translation-keys';

export const koTranslations: TranslationKeys = {
  // Mermaid flowchart labels
  'mermaid.start': '시작',
  'mermaid.end': '종료',
  'mermaid.question': '질문',
  'mermaid.conditionalBranch': '조건 분기',

  // Workflow execution guide
  'guide.title': '## 워크플로 실행 가이드',
  'guide.intro':
    '위의 Mermaid 플로우차트를 따라 워크플로를 실행하세요. 각 노드 유형의 실행 방법은 아래에 설명되어 있습니다.',
  'guide.nodeTypesTitle': '### 노드 유형별 실행 방법',
  'guide.nodeTypes.subAgent': '- **사각형 노드**: Task 도구를 사용하여 서브 에이전트 실행',
  'guide.nodeTypes.askUserQuestion':
    '- **다이아몬드 노드(AskUserQuestion:...)**: AskUserQuestion 도구를 사용하여 사용자에게 질문하고 응답에 따라 분기',
  'guide.nodeTypes.branch':
    '- **다이아몬드 노드(Branch/Switch:...)**: 이전 처리 결과에 따라 자동으로 분기(세부 정보 섹션 참조)',
  'guide.nodeTypes.prompt':
    '- **사각형 노드(Prompt 노드)**: 아래 세부 정보 섹션에 설명된 프롬프트 실행',

  // Prompt node details
  'promptNode.title': '### Prompt 노드 세부 정보',
  'promptNode.availableVariables': '**사용 가능한 변수:**',
  'promptNode.variableNotSet': '(설정되지 않음)',

  // AskUserQuestion node details
  'askNode.title': '### AskUserQuestion 노드 세부 정보',
  'askNode.selectionMode': '**선택 모드:**',
  'askNode.aiSuggestions':
    'AI 제안(AI가 컨텍스트를 기반으로 옵션을 동적으로 생성하여 사용자에게 제시)',
  'askNode.multiSelect': '**다중 선택:** 활성화됨(사용자가 여러 옵션을 선택할 수 있음)',
  'askNode.singleSelect': '단일 선택(선택한 옵션에 따라 분기)',
  'askNode.options': '**옵션:**',
  'askNode.noDescription': '(설명 없음)',
  'askNode.multiSelectExplanation': '다중 선택 활성화됨(선택한 옵션 목록이 다음 노드로 전달됨)',

  // Branch node details (Legacy)
  'branchNode.title': '### Branch 노드 세부 정보',
  'branchNode.binary': '이진 분기',
  'branchNode.multiple': '다중 분기',
  'branchNode.conditions': '**분기 조건:**',
  'branchNode.executionMethod':
    '**실행 방법**: 이전 처리 결과를 평가하고 위의 조건에 따라 적절한 분기를 자동으로 선택합니다.',

  // IfElse node details
  'ifElseNode.title': '### If/Else 노드 세부 정보',
  'ifElseNode.binary': '이진 분기 (True/False)',
  'ifElseNode.evaluationTarget': '평가 대상',

  // Switch node details
  'switchNode.title': '### Switch 노드 세부 정보',
  'switchNode.multiple': '다중 분기 (2-N)',
  'switchNode.evaluationTarget': '평가 대상',

  // MCP node details
  'mcpNode.title': '## MCP 도구 노드',
  'mcpNode.description': '**설명**',
  'mcpNode.server': '**MCP 서버**',
  'mcpNode.toolName': '**도구 이름**',
  'mcpNode.validationStatus': '**검증 상태**',
  'mcpNode.configuredParameters': '**구성된 매개변수**',
  'mcpNode.availableParameters': '**사용 가능한 매개변수**',
  'mcpNode.required': '필수',
  'mcpNode.optional': '선택 사항',
  'mcpNode.noDescription': '설명 없음',
  'mcpNode.executionMethod':
    '이 노드는 MCP(Model Context Protocol) 도구를 호출합니다. 워크플로를 실행할 때 구성된 매개변수를 사용하여 MCP 서버를 통해 도구를 호출하세요.',

  // Error messages
  'error.noWorkspaceOpen': '폴더 또는 워크스페이스를 먼저 열어주세요.',

  // File picker
  'filePicker.title': '워크플로 파일 선택',
  'filePicker.error.invalidWorkflow':
    '잘못된 워크플로 파일입니다. 유효한 JSON 워크플로 파일을 선택해주세요.',
  'filePicker.error.loadFailed': '워크플로 파일을 불러오는데 실패했습니다.',
};
