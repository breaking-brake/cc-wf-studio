# cc-wf-studio 분석 리포트

> 분석 일자: 2026-01-04
> 분석 대상: cc-wf-studio v3.12.0

---

## 1. 프로젝트 개요

### 1.1 정의

**Claude Code Workflow Studio**는 AI 자동화 워크플로우를 시각적으로 설계할 수 있는 **VSCode 확장 프로그램**이다.

- **목적**: 코드 작성 없이 드래그 앤 드롭으로 Claude Code 워크플로우 설계
- **출력**: `.claude/commands/*.md`, `.claude/agents/*.md` 파일 자동 생성
- **영감**: [Dify](https://dify.ai/) (AI 워크플로우 빌더)

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| No-Code | 프로그래밍 없이 시각적 설계 |
| Ready to Execute | 만든 즉시 Claude Code에서 실행 가능 |
| Easy Iteration | JSON 저장/로드로 빠른 실험 |
| Fully Local | 모든 작업이 로컬에서 실행 |

---

## 2. 기술 스택

### 2.1 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  Extension Host (Node.js)                           │
│  - TypeScript 5.3                                   │
│  - VSCode Extension API 1.80+                       │
│  - @modelcontextprotocol/sdk (MCP 연동)             │
│  - @slack/web-api (Slack API)                       │
└───────────────────┬─────────────────────────────────┘
                    │ postMessage (양방향)
                    ▼
┌─────────────────────────────────────────────────────┐
│  Webview UI (React)                                 │
│  - React 19 + React Flow 11.10                      │
│  - Zustand (상태관리)                               │
│  - Radix UI (컴포넌트)                              │
│  - Vite (빌드)                                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 프로젝트 구조

```
src/
├── extension/          # VSCode Extension Host
│   ├── commands/       # 15개 커맨드 핸들러
│   ├── services/       # 20개 핵심 서비스
│   └── utils/          # 유틸리티 모듈
├── webview/            # React UI
│   └── src/
│       ├── components/ # UI 컴포넌트
│       ├── stores/     # Zustand 스토어
│       └── services/   # API 브릿지
└── shared/             # 공유 타입 정의
```

---

## 3. 노드 시스템

### 3.1 노드 타입 (11개 고정)

노드는 **Claude Code 기능 단위**로 설계되어 있으며, 동적으로 추가/변경되지 않는다.

#### 구조 노드
| 노드 | 용도 |
|------|------|
| Start | 워크플로우 시작점 |
| End | 워크플로우 종료점 |

#### 실행 노드
| 노드 | 용도 | Claude Code 대응 |
|------|------|------------------|
| SubAgent | AI 에이전트 실행 | `.claude/agents/*.md` |
| SubAgentFlow | 재사용 가능한 서브 워크플로우 | 중첩 에이전트 |
| Prompt | 템플릿 변수 `{{var}}` 처리 | 변수 치환 |

#### 제어 노드
| 노드 | 용도 | 출력 포트 |
|------|------|----------|
| IfElse | 2분기 (true/false) | 2개 고정 |
| Switch | N분기 (다중 조건) | 2~10개 |
| AskUserQuestion | 사용자 선택 대기 | 2~4개 |

#### 통합 노드
| 노드 | 용도 | 연동 대상 |
|------|------|----------|
| Skill | Claude Code Skill 호출 | `.claude/skills/*/SKILL.md` |
| MCP | 외부 도구 연동 | MCP 서버 (Playwright, DB 등) |

### 3.2 노드 선택 기준 (사용자 관점)

```
"AI한테 뭔가 시키고 싶다"      → SubAgent
"이미 만든 스킬 쓰고 싶다"     → Skill
"외부 API/DB 연결하고 싶다"    → MCP
"조건에 따라 다르게 하고 싶다"  → IfElse / Switch
"사용자한테 물어보고 싶다"      → AskUserQuestion
"변수 넣은 텍스트 만들고 싶다"  → Prompt
```

---

## 4. 비주얼 에디터의 한계와 장점

### 4.1 한계: 상세 맥락 표현 불가

수동 작성 마크다운 (예: `speckit.implement.md`)은 135줄의 상세 지침을 포함:
- 기술 스택별 `.gitignore` 패턴 (10개 이상)
- 복잡한 조건부 로직
- 인라인 스크립트
- 에러 처리 전략

**비주얼 에디터로는 이런 깊이의 맥락 표현이 불가능하다.**

| 구분 | 수동 마크다운 | 비주얼 에디터 |
|------|--------------|---------------|
| 맥락 깊이 | 상세 지침 | 간단 프롬프트 |
| 조건 로직 | 복잡한 중첩 | IfElse/Switch만 |
| 코드 블록 | 인라인 스크립트 | 텍스트만 |
| 도메인 지식 | 기술별 패턴 | 추상화된 설명 |

### 4.2 장점: 멀티 에이전트 오케스트레이션

**서브에이전트 간 흐름 시각화**에서 비주얼 에디터의 가치가 드러난다.

```
수동 마크다운: 5개 에이전트 관계를 텍스트로 추적 → 복잡

비주얼 에디터:
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  Start   │────▶│ Code Analyzer│────▶│Security Check │
└──────────┘     └──────────────┘     └───────┬───────┘
                                              │
                      ┌───────────────────────┼───────────────┐
                      ▼                       ▼               ▼
               ┌─────────────┐        ┌─────────────┐  ┌─────────────┐
               │ 취약점 발견  │        │ 경고만 있음  │  │  통과       │
               └─────────────┘        └─────────────┘  └─────────────┘
```

### 4.3 적합한 사용 케이스

| 케이스 | 권장 도구 |
|--------|----------|
| 3개 이상 서브에이전트 오케스트레이션 | 비주얼 에디터 |
| 조건 분기 2개 이상 | 비주얼 에디터 |
| 팀에게 구조 공유 | 비주얼 에디터 |
| 단일 에이전트 + 복잡한 프롬프트 | 수동 마크다운 |
| 도메인 지식이 많이 필요한 태스크 | 수동 마크다운 |
| 인라인 스크립트 필요 | 수동 마크다운 |

---

## 5. 사용 패턴

### 5.1 세 가지 사용 모드

```
패턴 1: 비주얼만 사용
────────────────────
비주얼 에디터 → Export → .claude/*.md 자동 생성
(마크다운 직접 안 만짐)

패턴 2: 마크다운만 사용
────────────────────
.claude/*.md 직접 작성
(비주얼 에디터 안 씀)

패턴 3: 혼합 사용 (권장)
────────────────────
비주얼로 구조 설계 → Export → 마크다운 수동 보강
(흐름은 비주얼, 상세 로직은 마크다운)
```

### 5.2 레이어 분리 관점

```
┌─────────────────────────────────────┐
│  오케스트레이션 (비주얼 에디터)       │  ← 누가 → 누구 → 언제
├─────────────────────────────────────┤
│  실행 로직 (마크다운)                │  ← 각 에이전트가 뭘 어떻게
└─────────────────────────────────────┘
```

---

## 6. 플랫폼 확장 가능성

### 6.1 현재 VSCode 의존성

```
• vscode.window.createWebviewPanel()  → UI 렌더링
• vscode.workspace.fs                 → 파일 읽기/쓰기
• vscode.SecretStorage                → 토큰 저장
• vscode.commands                     → 커맨드 등록
• postMessage()                       → UI ↔ 백엔드
```

### 6.2 다른 플랫폼 지원 가능성

| 플랫폼 | Webview 지원 | 포팅 난이도 |
|--------|-------------|------------|
| Cursor (VSCode 포크) | ✅ | 그대로 작동 |
| JetBrains | ✅ JCEF | 재작성 필요 |
| 독립 웹앱 | ✅ | 2~3주 작업 |
| Zed | 🚧 | 미성숙 |
| Neovim | ❌ | 불가 |

### 6.3 다형성 아키텍처 (미래 방향)

```typescript
interface IEditorAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  showWebview(html: string): void;
  postMessage(message: unknown): void;
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
}

// 구현체
class VSCodeAdapter implements IEditorAdapter { ... }
class StandaloneAdapter implements IEditorAdapter { ... }
class JetBrainsAdapter implements IEditorAdapter { ... }
```

**React Flow UI는 100% 재사용 가능** → Adapter 레이어만 교체하면 다중 플랫폼 지원 가능

---

## 7. 결론

### 7.1 이 도구의 본질

> **"Claude Code Workflow Studio는 워크플로우 '흐름 설계 도구'이지, '상세 문서 대체제'가 아니다."**

### 7.2 핵심 인사이트

1. **노드는 Claude Code 기능과 1:1 매핑** → 11개 고정 타입
2. **비주얼 에디터의 강점은 멀티 에이전트 오케스트레이션**
3. **복잡한 도메인 로직은 여전히 수동 마크다운 필요**
4. **혼합 사용 (비주얼 + 마크다운)이 가장 효과적**
5. **Adapter 패턴으로 다중 플랫폼 확장 가능**

### 7.3 권장 사용 전략

```
1단계: 비주얼 에디터로 전체 흐름 설계
2단계: Export로 기본 마크다운 생성
3단계: 필요시 마크다운 직접 수정하여 상세 로직 추가
```

---

*이 문서는 cc-wf-studio 리포지토리 분석 대화를 기반으로 작성됨*
