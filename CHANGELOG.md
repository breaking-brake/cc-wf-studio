## [3.24.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.24.0...v3.24.1) (2026-02-21)

### Improvements

* move AI agent toggles into submenu and prevent menu auto-close ([#598](https://github.com/breaking-brake/cc-wf-studio/issues/598)) ([5032b9d](https://github.com/breaking-brake/cc-wf-studio/commit/5032b9d4ab7754388f20c7b83650aaaeaccb944b))
* rename Codex to Codex CLI in UI labels ([#600](https://github.com/breaking-brake/cc-wf-studio/issues/600)) ([34df72e](https://github.com/breaking-brake/cc-wf-studio/commit/34df72e05c50310a40e796a8fb3be290a5fe6a2f))
* split Copilot toggle into Copilot Chat and Copilot CLI ([#597](https://github.com/breaking-brake/cc-wf-studio/issues/597)) ([3f9fe0e](https://github.com/breaking-brake/cc-wf-studio/commit/3f9fe0e1b7a0bdb87ca47c15e6f9828690e6eb5f))

## [3.24.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.23.1...v3.24.0) (2026-02-20)

### Features

* move reviewBeforeApply setting to UI toggle in McpServerSection ([#595](https://github.com/breaking-brake/cc-wf-studio/issues/595)) ([a1efbd3](https://github.com/breaking-brake/cc-wf-studio/commit/a1efbd388157e067b552ecb31b12cd41cfc829fd))

## [3.23.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.23.0...v3.23.1) (2026-02-19)

### Bug Fixes

* remove basic schema variant and unify to full schema ([#592](https://github.com/breaking-brake/cc-wf-studio/issues/592)) ([694817f](https://github.com/breaking-brake/cc-wf-studio/commit/694817f5b43d5aa4fff9af3f06c9c104b7b06365))

## [3.23.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.22.2...v3.23.0) (2026-02-19)

### Features

* add SubAgent compatibility checks and remove Beta labels ([#589](https://github.com/breaking-brake/cc-wf-studio/issues/589)) ([7abf087](https://github.com/breaking-brake/cc-wf-studio/commit/7abf0870a112227081a0de973a20079088764699))

## [3.22.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.22.1...v3.22.2) (2026-02-18)

### Improvements

* add Roo Code MCP server detection for tool nodes ([#587](https://github.com/breaking-brake/cc-wf-studio/issues/587)) ([cca11fe](https://github.com/breaking-brake/cc-wf-studio/commit/cca11feb88b987868706968e1881384c69bce08b))

## [3.22.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.22.0...v3.22.1) (2026-02-18)

### Bug Fixes

* escape Mermaid-special characters in node labels ([#579](https://github.com/breaking-brake/cc-wf-studio/issues/579)) ([fced314](https://github.com/breaking-brake/cc-wf-studio/commit/fced3148f997100269e42bbc5f7156c8afb3477d))
* support HTTP transport for MCP tool nodes ([#581](https://github.com/breaking-brake/cc-wf-studio/issues/581)) ([cebcd21](https://github.com/breaking-brake/cc-wf-studio/commit/cebcd21a10fd0bd246e0d4b0db91e92c070eadd2))

### Improvements

* remove redundant validate_workflow MCP tool ([#580](https://github.com/breaking-brake/cc-wf-studio/issues/580)) ([8683434](https://github.com/breaking-brake/cc-wf-studio/commit/868343433b98d473c187d47dbbd06b7764bd02f6))

## [3.22.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.21.0...v3.22.0) (2026-02-16)

### Features

* add Gemini CLI provider integration ([#565](https://github.com/breaking-brake/cc-wf-studio/issues/565)) ([8b0fd76](https://github.com/breaking-brake/cc-wf-studio/commit/8b0fd7643c12c817d723b25f68e60d56cb4dff94))

### Bug Fixes

* clarify connection constraints for parallel execution support ([#568](https://github.com/breaking-brake/cc-wf-studio/issues/568)) ([8f9d58f](https://github.com/breaking-brake/cc-wf-studio/commit/8f9d58fdbf9b712a79d5852f5a7895bab97a7f28)), closes [#564](https://github.com/breaking-brake/cc-wf-studio/issues/564)

### Improvements

* enhance workflow schema for AI editing quality ([#559](https://github.com/breaking-brake/cc-wf-studio/issues/559)) ([1a53ccc](https://github.com/breaking-brake/cc-wf-studio/commit/1a53ccc6d406727a70d5f727ffc1fbaf557dccb3))

## [3.21.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.20.0...v3.21.0) (2026-02-08)

### Features

* add built-in MCP server for external AI agent integration ([#550](https://github.com/breaking-brake/cc-wf-studio/issues/550)) ([0e34d0a](https://github.com/breaking-brake/cc-wf-studio/commit/0e34d0a683811168ad9f83fb0dc5139b3c267666))

## [3.20.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.19.2...v3.20.0) (2026-02-07)

### Features

* add Roo Code skills integration (export & run) ([#543](https://github.com/breaking-brake/cc-wf-studio/issues/543)) ([913eba0](https://github.com/breaking-brake/cc-wf-studio/commit/913eba0746d55daaa34f07f9ef338736a09bc94a))

### Improvements

* add persistent memory setting to SubAgent and SubAgentFlow nodes ([#541](https://github.com/breaking-brake/cc-wf-studio/issues/541)) ([b48acd7](https://github.com/breaking-brake/cc-wf-studio/commit/b48acd7eef701da7d843a48fe97d8bcda0b83919))
* add Roo Code skills detection and documentation ([#545](https://github.com/breaking-brake/cc-wf-studio/issues/545)) ([5db6252](https://github.com/breaking-brake/cc-wf-studio/commit/5db6252666653ed5c4b688c7ea9aedfb035363d9))
* simplify Skill node description in exported MD files ([#547](https://github.com/breaking-brake/cc-wf-studio/issues/547)) ([3fc1f6c](https://github.com/breaking-brake/cc-wf-studio/commit/3fc1f6cad9da0dbf74fa9d2cde63c120899e91a1))

## [3.19.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.19.1...v3.19.2) (2026-02-06)

### Bug Fixes

* replace DeepWiki SVG badge with shields.io badge ([#537](https://github.com/breaking-brake/cc-wf-studio/issues/537)) ([8cccf77](https://github.com/breaking-brake/cc-wf-studio/commit/8cccf77f26e452d5b59a7e2c17727b42c51b2732))
* replace inline SVG icons with PNG in README for vsce compatibility ([#538](https://github.com/breaking-brake/cc-wf-studio/issues/538)) ([16b0f97](https://github.com/breaking-brake/cc-wf-studio/commit/16b0f97dfeefacf7db266bb50ad37632a61a64ae))

### Improvements

* add executionMode to Skill nodes (load/execute) ([#533](https://github.com/breaking-brake/cc-wf-studio/issues/533)) ([590d832](https://github.com/breaking-brake/cc-wf-studio/commit/590d8320db8a5dae267fccac135ea258298f6b38))

### Documentation

* add DeepWiki badge to README ([#530](https://github.com/breaking-brake/cc-wf-studio/issues/530)) ([c1170a1](https://github.com/breaking-brake/cc-wf-studio/commit/c1170a1e7f9ada5f3271295619ceb2c001e7531e))
* clarify Save/Load vs Export in README ([#529](https://github.com/breaking-brake/cc-wf-studio/issues/529)) ([c2754a4](https://github.com/breaking-brake/cc-wf-studio/commit/c2754a4673aa09be1a7b5743916c094440a1f91b)), closes [#528](https://github.com/breaking-brake/cc-wf-studio/issues/528)

## [3.19.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.19.0...v3.19.1) (2026-01-31)

### Bug Fixes

* allow Codex node in Sub-Agent Flow ([#523](https://github.com/breaking-brake/cc-wf-studio/issues/523)) ([4622f88](https://github.com/breaking-brake/cc-wf-studio/commit/4622f88dddae97590bcbb463bbbb138f0bbb9e62))

## [3.19.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.18.2...v3.19.0) (2026-01-31)

### Features

* add Codex Agent node ([#518](https://github.com/breaking-brake/cc-wf-studio/issues/518)) ([#519](https://github.com/breaking-brake/cc-wf-studio/issues/519)) ([9d4b23c](https://github.com/breaking-brake/cc-wf-studio/commit/9d4b23c2050fd949f10379cd6fed72e38232ea62))

## [3.18.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.18.1...v3.18.2) (2026-01-29)

### Bug Fixes

* add CLI-aware skill normalization to skip native directories ([#512](https://github.com/breaking-brake/cc-wf-studio/issues/512)) ([0c49d94](https://github.com/breaking-brake/cc-wf-studio/commit/0c49d946a1c42218631f583196b5d9e8eaf6e9b2))
* add MCP server detection for Copilot CLI and Codex CLI ([#509](https://github.com/breaking-brake/cc-wf-studio/issues/509)) ([#510](https://github.com/breaking-brake/cc-wf-studio/issues/510)) ([ef31649](https://github.com/breaking-brake/cc-wf-studio/commit/ef3164914222efbfe1b81c0c4487b0f0101a5b81))
* add skills detection for Copilot/Codex with grouped UI ([#508](https://github.com/breaking-brake/cc-wf-studio/issues/508)) ([ab89f69](https://github.com/breaking-brake/cc-wf-studio/commit/ab89f69db9ab5a19e0eecc42fcf9e29cb1054d58)), closes [#507](https://github.com/breaking-brake/cc-wf-studio/issues/507)
* remove Codex project trust workaround ([#513](https://github.com/breaking-brake/cc-wf-studio/issues/513)) ([c5a9c45](https://github.com/breaking-brake/cc-wf-studio/commit/c5a9c45fb1280431f757ca9199773233ccaa9c46)), closes [#495](https://github.com/breaking-brake/cc-wf-studio/issues/495)
* resolve skill source path correctly for all scopes ([#514](https://github.com/breaking-brake/cc-wf-studio/issues/514)) ([8caf97e](https://github.com/breaking-brake/cc-wf-studio/commit/8caf97e6e19f713a860a8aac30038c60a1ffb3a9))
* show AI provider badge for user scope skills ([#515](https://github.com/breaking-brake/cc-wf-studio/issues/515)) ([760d411](https://github.com/breaking-brake/cc-wf-studio/commit/760d4111508b9b2c4ac9c30f98a499edbb214b9e))

### Documentation

* add AI coding tools configuration reference ([#505](https://github.com/breaking-brake/cc-wf-studio/issues/505)) ([f3bd005](https://github.com/breaking-brake/cc-wf-studio/commit/f3bd005cc27234d68af4f5633609c1bf8f4b2f96))

## [3.18.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.18.0...v3.18.1) (2026-01-24)

### Bug Fixes

* use provider-specific translation keys for AI edit messages ([#504](https://github.com/breaking-brake/cc-wf-studio/issues/504)) ([581ce5c](https://github.com/breaking-brake/cc-wf-studio/commit/581ce5cc34d4158ec7b2e23550925b2d56ad878d))

### Improvements

* add Codex CLI as AI provider for workflow refinement ([#502](https://github.com/breaking-brake/cc-wf-studio/issues/502)) ([0f8c654](https://github.com/breaking-brake/cc-wf-studio/commit/0f8c654d4bf1d6a0ca48ef05d62ea79c6c4d6ff8))

## [3.18.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.17.0...v3.18.0) (2026-01-24)

### Features

* add OpenAI Codex CLI integration support ([#496](https://github.com/breaking-brake/cc-wf-studio/issues/496)) ([60d5c96](https://github.com/breaking-brake/cc-wf-studio/commit/60d5c962b131d195fddbd3795229c9271125514b)), closes [openai/codex#9752](https://github.com/openai/codex/issues/9752)

### Improvements

* add Codex CLI feature announcement banner ([#497](https://github.com/breaking-brake/cc-wf-studio/issues/497)) ([bf8128a](https://github.com/breaking-brake/cc-wf-studio/commit/bf8128a05941f7f136f4401cbf0554a33859e523))
* add confirmation dialog for Codex project trust setting ([#499](https://github.com/breaking-brake/cc-wf-studio/issues/499)) ([e5523d5](https://github.com/breaking-brake/cc-wf-studio/commit/e5523d53b8ea3e7c3624f5f2cbfeaedf4ae71851))
* detect skills under .github directory ([#494](https://github.com/breaking-brake/cc-wf-studio/issues/494)) ([eb38d8a](https://github.com/breaking-brake/cc-wf-studio/commit/eb38d8ae87bd2ed447b0debce9eed11159aad5af)), closes [#493](https://github.com/breaking-brake/cc-wf-studio/issues/493) [#493](https://github.com/breaking-brake/cc-wf-studio/issues/493) [#6366f1](https://github.com/breaking-brake/cc-wf-studio/issues/6366f1) [#c2410c](https://github.com/breaking-brake/cc-wf-studio/issues/c2410c)
* show "Slash Command / Skill" label when Copilot/Codex enabled ([#498](https://github.com/breaking-brake/cc-wf-studio/issues/498)) ([2be7ac6](https://github.com/breaking-brake/cc-wf-studio/commit/2be7ac6ab7f0e1e6221f261a1064c37a6ff3d11c))

## [3.17.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.16.1...v3.17.0) (2026-01-22)

### Features

* rename to CC Workflow Studio ([#477](https://github.com/breaking-brake/cc-wf-studio/issues/477)) ([d8239a3](https://github.com/breaking-brake/cc-wf-studio/commit/d8239a3873a4eeef0687f0543fa77ffedde57fb3))

### Bug Fixes

* add ~/.mcp.json support to MCP config reader ([#488](https://github.com/breaking-brake/cc-wf-studio/issues/488)) ([9ef0abf](https://github.com/breaking-brake/cc-wf-studio/commit/9ef0abf2424ad4802c6d28f8819756ea27783b26)), closes [#484](https://github.com/breaking-brake/cc-wf-studio/issues/484)
* display dynamic provider name in refinement chat initial message ([#476](https://github.com/breaking-brake/cc-wf-studio/issues/476)) ([1e19be6](https://github.com/breaking-brake/cc-wf-studio/commit/1e19be6dd6978e08fb41f284aaadb48e0cd0bb08))
* hide CLAUDE.md tip in Edit with AI when using Copilot ([#480](https://github.com/breaking-brake/cc-wf-studio/issues/480)) ([f041493](https://github.com/breaking-brake/cc-wf-studio/commit/f0414931a3745f79335eea89474de5740d7491ac))
* YAML escaping and Copilot tools export improvements ([#485](https://github.com/breaking-brake/cc-wf-studio/issues/485)) ([dbcda41](https://github.com/breaking-brake/cc-wf-studio/commit/dbcda412074bf98ed7f8627a8aefcace8280ff13))

### Improvements

* clarify Copilot uses VSCode Language Model API ([#482](https://github.com/breaking-brake/cc-wf-studio/issues/482)) ([c9e7e2f](https://github.com/breaking-brake/cc-wf-studio/commit/c9e7e2fc83490ddf77256d6b9e13cee77cf614d1))
* remove Slack import/export demo from README ([#483](https://github.com/breaking-brake/cc-wf-studio/issues/483)) ([1c647c2](https://github.com/breaking-brake/cc-wf-studio/commit/1c647c2c5fec52de7b20359960a420aeb85c1839))

## [3.16.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.16.0...v3.16.1) (2026-01-20)

### Bug Fixes

* show correct error messages for Copilot and Claude Code CLI unavailability ([#473](https://github.com/breaking-brake/cc-wf-studio/issues/473)) ([7e7f94c](https://github.com/breaking-brake/cc-wf-studio/commit/7e7f94c016bb53c0ac6474a6b264edf0d810bf56)), closes [#471](https://github.com/breaking-brake/cc-wf-studio/issues/471)

## [3.16.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.15.3...v3.16.0) (2026-01-19)

### Features

* add Copilot support for AI workflow editing ([#469](https://github.com/breaking-brake/cc-wf-studio/issues/469)) ([e655136](https://github.com/breaking-brake/cc-wf-studio/commit/e65513668246939c7eeebe75f3038ad732fb96b1))

## [3.15.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.15.2...v3.15.3) (2026-01-17)

### Bug Fixes

* normalize CRLF line endings for Windows compatibility ([#464](https://github.com/breaking-brake/cc-wf-studio/issues/464)) ([d2e1c5f](https://github.com/breaking-brake/cc-wf-studio/commit/d2e1c5f3069f2f46742d06d9dada7ce7f3cdd740)), closes [#463](https://github.com/breaking-brake/cc-wf-studio/issues/463)
* use VSCode default terminal to find Claude CLI on Windows ([#465](https://github.com/breaking-brake/cc-wf-studio/issues/465)) ([dfa435b](https://github.com/breaking-brake/cc-wf-studio/commit/dfa435b474c92549d98267ad9b2143556de21eb9))

## [3.15.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.15.1...v3.15.2) (2026-01-16)

### Improvements

* add Copilot execution mode selection and consolidate prompt generation ([#461](https://github.com/breaking-brake/cc-wf-studio/issues/461)) ([0447683](https://github.com/breaking-brake/cc-wf-studio/commit/0447683231ee4f51810d2485c28bdcad65794d2c))

## [3.15.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.15.0...v3.15.1) (2026-01-15)

### Improvements

* add MCP config auto-sync for Copilot export ([#457](https://github.com/breaking-brake/cc-wf-studio/issues/457)) ([f989c66](https://github.com/breaking-brake/cc-wf-studio/commit/f989c6691ee5633a20da3ca861dae976ac85f465))

## [3.15.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.6...v3.15.0) (2026-01-14)

### Features

* add GitHub Copilot export integration (Beta) ([#454](https://github.com/breaking-brake/cc-wf-studio/issues/454)) ([5d71afe](https://github.com/breaking-brake/cc-wf-studio/commit/5d71afe14278b08f4d0b3e87c5a7f9e925071fc7))

## [3.14.6](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.5...v3.14.6) (2026-01-13)

### Bug Fixes

* load argumentHint from JSON when opening workflow ([#451](https://github.com/breaking-brake/cc-wf-studio/issues/451)) ([2965de1](https://github.com/breaking-brake/cc-wf-studio/commit/2965de1bdac906f7ffbebda10646b09e6ae6350e))

## [3.14.5](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.4...v3.14.5) (2026-01-13)

### Improvements

* add argument-hint configuration to SlashCommandOptions ([#449](https://github.com/breaking-brake/cc-wf-studio/issues/449)) ([df71af7](https://github.com/breaking-brake/cc-wf-studio/commit/df71af709554852e01145b5b4011959fe3a11c1d))

## [3.14.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.3...v3.14.4) (2026-01-13)

### Improvements

* stabilize AI editing flow with explicit process diagram ([#446](https://github.com/breaking-brake/cc-wf-studio/issues/446)) ([633aec9](https://github.com/breaking-brake/cc-wf-studio/commit/633aec9de3512da17a7330fa84e09a116517cfe7))

## [3.14.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.2...v3.14.3) (2026-01-13)

### Bug Fixes

* ensure consistent left-side submenu positioning ([#434](https://github.com/breaking-brake/cc-wf-studio/issues/434)) ([0679f7d](https://github.com/breaking-brake/cc-wf-studio/commit/0679f7dc999ea8ca41d680d810eb8ae49fcb0b84)), closes [#433](https://github.com/breaking-brake/cc-wf-studio/issues/433)

### Improvements

* add disable-model-invocation configuration UI for Slash Command export ([#443](https://github.com/breaking-brake/cc-wf-studio/issues/443)) ([8eac0a0](https://github.com/breaking-brake/cc-wf-studio/commit/8eac0a0efd44db7bd3c676f31725edd0cc1f5cdf))
* reorganize SlashCommandOptions dropdown and add help link ([#444](https://github.com/breaking-brake/cc-wf-studio/issues/444)) ([d39a702](https://github.com/breaking-brake/cc-wf-studio/commit/d39a702dca7b9ff11b8ab9e53088178b2ac1fe16))

## [3.14.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.1...v3.14.2) (2026-01-12)

### Improvements

* add allowed-tools configuration UI for Slash Command export ([#431](https://github.com/breaking-brake/cc-wf-studio/issues/431)) ([0add0c3](https://github.com/breaking-brake/cc-wf-studio/commit/0add0c3f4924a4e6acac306aa2b35d94851300c1))

## [3.14.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.14.0...v3.14.1) (2026-01-11)

### Improvements

* add hooks configuration UI for Slash Command export ([#427](https://github.com/breaking-brake/cc-wf-studio/issues/427)) ([a20257a](https://github.com/breaking-brake/cc-wf-studio/commit/a20257ac4d37cb465a804c769f351588760ca35f))

## [3.14.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.13.1...v3.14.0) (2026-01-10)

### Features

* add context: fork option for Slash Command export ([#420](https://github.com/breaking-brake/cc-wf-studio/issues/420)) ([1d860eb](https://github.com/breaking-brake/cc-wf-studio/commit/1d860eb6bd11fa147ec77111463bfca8c174eaaa))
* add model option to Slash Command export settings ([#421](https://github.com/breaking-brake/cc-wf-studio/issues/421)) ([b1adf52](https://github.com/breaking-brake/cc-wf-studio/commit/b1adf52fc8188723caff96a60d8e73b443ef9747))

### Bug Fixes

* change contextFork boolean to context string for extensibility ([#422](https://github.com/breaking-brake/cc-wf-studio/issues/422)) ([732880a](https://github.com/breaking-brake/cc-wf-studio/commit/732880abd1b4f814a2ca912d61f05c0d65bdc9ca))
* disable SubAgentFlow submit button when name validation fails ([#417](https://github.com/breaking-brake/cc-wf-studio/issues/417)) ([#418](https://github.com/breaking-brake/cc-wf-studio/issues/418)) ([2edb07d](https://github.com/breaking-brake/cc-wf-studio/commit/2edb07d41d3783516455e5361039a6d6709cdd4b))
* enforce lowercase-only workflow and SubAgentFlow names ([#415](https://github.com/breaking-brake/cc-wf-studio/issues/415)) ([#416](https://github.com/breaking-brake/cc-wf-studio/issues/416)) ([ccc0cda](https://github.com/breaking-brake/cc-wf-studio/commit/ccc0cda53ae2e3a1ac7c2927ff4f1993532ddc8d))

## [3.13.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.13.0...v3.13.1) (2026-01-09)

### Improvements

* add session reconnection warning dialog for AI refinement ([#410](https://github.com/breaking-brake/cc-wf-studio/issues/410)) ([c19aa3c](https://github.com/breaking-brake/cc-wf-studio/commit/c19aa3ce526120b22e3516dba88a65e2ad424eac))

## [3.13.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.10...v3.13.0) (2026-01-09)

### Features

* add session continuation support for AI refinement ([#408](https://github.com/breaking-brake/cc-wf-studio/issues/408)) ([4dd8812](https://github.com/breaking-brake/cc-wf-studio/commit/4dd8812222d82a64842a4d65c8a65a3e08e81c2c)), closes [#407](https://github.com/breaking-brake/cc-wf-studio/issues/407)

## [3.12.10](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.9...v3.12.10) (2026-01-08)

### Bug Fixes

* migrate all custom dialogs to Radix UI ([#403](https://github.com/breaking-brake/cc-wf-studio/issues/403)) ([29987b9](https://github.com/breaking-brake/cc-wf-studio/commit/29987b9d428e14071f85d3e4c88da3e3707c04b5))

## [3.12.9](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.8...v3.12.9) (2026-01-07)

### Bug Fixes

* resolve ConfirmDialog z-index issue in SubAgentFlowDialog ([#399](https://github.com/breaking-brake/cc-wf-studio/issues/399)) ([637c2fc](https://github.com/breaking-brake/cc-wf-studio/commit/637c2fc1a6b5454c1995c655d83e3d0f3e3a6526))
* use WEBVIEW_READY message instead of setTimeout ([#398](https://github.com/breaking-brake/cc-wf-studio/issues/398)) ([f72f4b2](https://github.com/breaking-brake/cc-wf-studio/commit/f72f4b2bdcde1df8e044689a5651bfdbace0f633))

### Improvements

* add resizable width to AI editing panel ([#397](https://github.com/breaking-brake/cc-wf-studio/issues/397)) ([14918d2](https://github.com/breaking-brake/cc-wf-studio/commit/14918d2545b350a88c6ed57a83e6cb99751c59c8))

## [3.12.8](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.7...v3.12.8) (2026-01-06)

### Bug Fixes

* handle multiple JSON blocks in AI response parsing ([#393](https://github.com/breaking-brake/cc-wf-studio/issues/393)) ([29c01bf](https://github.com/breaking-brake/cc-wf-studio/commit/29c01bfb59806e74de36daea261a349d659713c0))

### Improvements

* add node name constraint to AI refinement prompts ([#394](https://github.com/breaking-brake/cc-wf-studio/issues/394)) ([055d254](https://github.com/breaking-brake/cc-wf-studio/commit/055d2545616a16c772002a333ddaa9a7737505d8))
* auto-focus canvas on newly added nodes ([#392](https://github.com/breaking-brake/cc-wf-studio/issues/392)) ([7c1856c](https://github.com/breaking-brake/cc-wf-studio/commit/7c1856c7dba07cacb2a5f06e262299214ce00c2c))

## [3.12.7](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.6...v3.12.7) (2026-01-06)

### Bug Fixes

* sync activeWorkflow with canvas changes for AI refinement ([#390](https://github.com/breaking-brake/cc-wf-studio/issues/390)) ([08947d7](https://github.com/breaking-brake/cc-wf-studio/commit/08947d7aaa3272c5ef229081875b645d1b6272df)), closes [#388](https://github.com/breaking-brake/cc-wf-studio/issues/388)
* sync conversation history to workflow-store on every change ([#387](https://github.com/breaking-brake/cc-wf-studio/issues/387)) ([d1cf8a4](https://github.com/breaking-brake/cc-wf-studio/commit/d1cf8a4ccc5a82cd4f50bc967e0d12a998fe00ab)), closes [#384](https://github.com/breaking-brake/cc-wf-studio/issues/384)

## [3.12.6](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.5...v3.12.6) (2026-01-06)

### Bug Fixes

* apply CLI path detection to MCP CLI service ([#381](https://github.com/breaking-brake/cc-wf-studio/issues/381)) ([2aabfee](https://github.com/breaking-brake/cc-wf-studio/commit/2aabfee97ecfcf3811b88e771a14a4e53e8ac19e))

### Improvements

* add server name filter to MCP server list ([#380](https://github.com/breaking-brake/cc-wf-studio/issues/380)) ([348e6b3](https://github.com/breaking-brake/cc-wf-studio/commit/348e6b3fc95ffa2b61eff8e674a5a8854382786b))
* move skill filter above tabs for cross-tab filtering ([#379](https://github.com/breaking-brake/cc-wf-studio/issues/379)) ([d1da015](https://github.com/breaking-brake/cc-wf-studio/commit/d1da015f5493e558df6daab204dec70b61d73807))

## [3.12.5](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.4...v3.12.5) (2026-01-05)

### Bug Fixes

* detect Claude CLI in known installation paths ([#376](https://github.com/breaking-brake/cc-wf-studio/issues/376)) ([b2754b5](https://github.com/breaking-brake/cc-wf-studio/commit/b2754b599482099976a6d488494efec424410155)), closes [#375](https://github.com/breaking-brake/cc-wf-studio/issues/375)

## [3.12.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.3...v3.12.4) (2026-01-05)

### Bug Fixes

* add z-index to Radix UI dialogs for proper stacking ([#372](https://github.com/breaking-brake/cc-wf-studio/issues/372)) ([b4060a5](https://github.com/breaking-brake/cc-wf-studio/commit/b4060a5dbcf51f3106a08d4abd49dffdbe7989b5))
* close property dialog when node is deleted ([#371](https://github.com/breaking-brake/cc-wf-studio/issues/371)) ([8abbc9f](https://github.com/breaking-brake/cc-wf-studio/commit/8abbc9fd71a9b55d29521b406200f348cd67ef6c))

### Improvements

* pass validation errors to AI on refinement retry ([#373](https://github.com/breaking-brake/cc-wf-studio/issues/373)) ([bef0c0f](https://github.com/breaking-brake/cc-wf-studio/commit/bef0c0f4197fd0466beec778679d194e9d842cb5))

## [3.12.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.2...v3.12.3) (2026-01-05)

### Bug Fixes

* skills not detected on Windows due to CRLF line endings ([#369](https://github.com/breaking-brake/cc-wf-studio/issues/369)) ([f453576](https://github.com/breaking-brake/cc-wf-studio/commit/f4535765ec29a7f0a807c86a0206810252ef8b9c)), closes [#361](https://github.com/breaking-brake/cc-wf-studio/issues/361)

## [3.12.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.1...v3.12.2) (2026-01-04)

### Bug Fixes

* plugin-installed skills not appearing in Skill Browser ([#365](https://github.com/breaking-brake/cc-wf-studio/issues/365)) ([c169362](https://github.com/breaking-brake/cc-wf-studio/commit/c169362ca77062b9a98ef48a4837808ef0c825ad))

## [3.12.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.12.0...v3.12.1) (2026-01-04)

### Improvements

* add on-canvas description panel for workflow editing ([#360](https://github.com/breaking-brake/cc-wf-studio/issues/360)) ([ee9fa11](https://github.com/breaking-brake/cc-wf-studio/commit/ee9fa1127f8e108198c6609970f00e9c79a6ffeb))

## [3.12.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.11.3...v3.12.0) (2026-01-03)

### Features

* add workflow preview with CustomTextEditorProvider ([#357](https://github.com/breaking-brake/cc-wf-studio/issues/357)) ([adc3081](https://github.com/breaking-brake/cc-wf-studio/commit/adc30815de228b5e2cf4bfc4a42758d7852a7b84))

## [3.11.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.11.2...v3.11.3) (2026-01-02)

### Bug Fixes

* rename Convert button to Export in toolbar ([#355](https://github.com/breaking-brake/cc-wf-studio/issues/355)) ([86ff1e3](https://github.com/breaking-brake/cc-wf-studio/commit/86ff1e33bc37a2c98face0f258ea288a09809f00))

## [3.11.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.11.1...v3.11.2) (2026-01-02)

### Bug Fixes

* treat non-JSON AI response as clarification message ([#352](https://github.com/breaking-brake/cc-wf-studio/issues/352)) ([9833905](https://github.com/breaking-brake/cc-wf-studio/commit/98339051a8a01387ac62cc0ee5c563e6855b32a9))
* use claude CLI directly with npx fallback ([#353](https://github.com/breaking-brake/cc-wf-studio/issues/353)) ([83fb827](https://github.com/breaking-brake/cc-wf-studio/commit/83fb82756580de0122ddb4a8e40246a8a5065cb4))

## [3.11.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.11.0...v3.11.1) (2026-01-01)

### Bug Fixes

* use cross-platform path separator for agent file detection ([#348](https://github.com/breaking-brake/cc-wf-studio/issues/348)) ([49479cd](https://github.com/breaking-brake/cc-wf-studio/commit/49479cd0b39b1cb899244b73c2467bd36435f7f0)), closes [#345](https://github.com/breaking-brake/cc-wf-studio/issues/345)
* use workspace .vscode/ for editor temp files on Windows ([#349](https://github.com/breaking-brake/cc-wf-studio/issues/349)) ([00c13a4](https://github.com/breaking-brake/cc-wf-studio/commit/00c13a4e71d417b8af09cfd3dc44731f0eee25a4))

### Improvements

* remove unnecessary info message from editor ([#347](https://github.com/breaking-brake/cc-wf-studio/issues/347)) ([2f65423](https://github.com/breaking-brake/cc-wf-studio/commit/2f654234a8387d28715e7e39e3dfcebecd2893d0))

## [3.11.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.10.2...v3.11.0) (2026-01-01)

### Features

* add Edit in VSCode Editor functionality ([#341](https://github.com/breaking-brake/cc-wf-studio/issues/341)) ([e61bc51](https://github.com/breaking-brake/cc-wf-studio/commit/e61bc51de528aa3322a24ef3391c1061bdb8bd0c))

## [3.10.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.10.1...v3.10.2) (2025-12-30)

### Improvements

* remove edge deletion confirmation dialog ([#336](https://github.com/breaking-brake/cc-wf-studio/issues/336)) ([b375974](https://github.com/breaking-brake/cc-wf-studio/commit/b375974429bec41eef2d0cd0ba939c5561d37dd6))

## [3.10.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.10.0...v3.10.1) (2025-12-30)

### Improvements

* add delete button to edge connections ([#334](https://github.com/breaking-brake/cc-wf-studio/issues/334)) ([c04c015](https://github.com/breaking-brake/cc-wf-studio/commit/c04c01542fa4fdabc89551080cf59c313bf78e17)), closes [#331](https://github.com/breaking-brake/cc-wf-studio/issues/331)

## [3.10.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.9.1...v3.10.0) (2025-12-29)

### Features

* add Focus Mode for compact UI display ([#328](https://github.com/breaking-brake/cc-wf-studio/issues/328)) ([16d03ca](https://github.com/breaking-brake/cc-wf-studio/commit/16d03cac7e6da2c98baa8c2c4ed5ea8f18b8fa0e))

### Documentation

* add Star History chart and badges to README ([#327](https://github.com/breaking-brake/cc-wf-studio/issues/327)) ([e8c45bb](https://github.com/breaking-brake/cc-wf-studio/commit/e8c45bb0f0795cafbd788811981c80f8bb9bf4b5))
* update hero image with new workflow screenshot ([#325](https://github.com/breaking-brake/cc-wf-studio/issues/325)) ([81255b8](https://github.com/breaking-brake/cc-wf-studio/commit/81255b830aeaaea52ae64c611f43c3bec92f20e6))
* update README demo GIFs with Edit with AI and Run Workflow demos ([#326](https://github.com/breaking-brake/cc-wf-studio/issues/326)) ([128e0be](https://github.com/breaking-brake/cc-wf-studio/commit/128e0beb4ac2adaae7b34bf620fa98c15512fabf))

## [3.10.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.9.1...v3.10.0) (2025-12-29)

### Features

* add Focus Mode for compact UI display ([#328](https://github.com/breaking-brake/cc-wf-studio/issues/328)) ([16d03ca](https://github.com/breaking-brake/cc-wf-studio/commit/16d03cac7e6da2c98baa8c2c4ed5ea8f18b8fa0e))

### Documentation

* add Star History chart and badges to README ([#327](https://github.com/breaking-brake/cc-wf-studio/issues/327)) ([e8c45bb](https://github.com/breaking-brake/cc-wf-studio/commit/e8c45bb0f0795cafbd788811981c80f8bb9bf4b5))
* update hero image with new workflow screenshot ([#325](https://github.com/breaking-brake/cc-wf-studio/issues/325)) ([81255b8](https://github.com/breaking-brake/cc-wf-studio/commit/81255b830aeaaea52ae64c611f43c3bec92f20e6))
* update README demo GIFs with Edit with AI and Run Workflow demos ([#326](https://github.com/breaking-brake/cc-wf-studio/issues/326)) ([128e0be](https://github.com/breaking-brake/cc-wf-studio/commit/128e0beb4ac2adaae7b34bf620fa98c15512fabf))

## [3.9.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.9.0...v3.9.1) (2025-12-23)

### Bug Fixes

* isolate panel state between SubAgentFlowDialog and main canvas ([#323](https://github.com/breaking-brake/cc-wf-studio/issues/323)) ([a1c9d7e](https://github.com/breaking-brake/cc-wf-studio/commit/a1c9d7e7b4e9579e601ca56f58e666ba1cc43095))
* resolve dialog z-index stacking issue in SubAgentFlowDialog ([#322](https://github.com/breaking-brake/cc-wf-studio/issues/322)) ([7eb6b0c](https://github.com/breaking-brake/cc-wf-studio/commit/7eb6b0c44bfe8358c97f1ebae317961028da1b85))
* resolve gap between node palette and canvas in compact mode ([#311](https://github.com/breaking-brake/cc-wf-studio/issues/311)) ([8d6ec52](https://github.com/breaking-brake/cc-wf-studio/commit/8d6ec5276557bd7b8f60b45814c7d84305cfcfe3))

### Improvements

* fix tour Load button focus and add Run step ([#312](https://github.com/breaking-brake/cc-wf-studio/issues/312)) ([9ac27ab](https://github.com/breaking-brake/cc-wf-studio/commit/9ac27ab9709e7bdd97cee9d7db0bcd066c0b3732))
* refine AI editing panel layout with overlay separation ([#321](https://github.com/breaking-brake/cc-wf-studio/issues/321)) ([9c30e4e](https://github.com/breaking-brake/cc-wf-studio/commit/9c30e4e3347ce9b90e486c8a4f23ad75e0bee95e))

## [3.9.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.5...v3.9.0) (2025-12-22)

### Features

* add Run as Slash Command feature with toolbar UI improvements ([#309](https://github.com/breaking-brake/cc-wf-studio/issues/309)) ([c7526a3](https://github.com/breaking-brake/cc-wf-studio/commit/c7526a3dc65e348dc40b4e52f98cc4bb718682aa))

## [3.8.5](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.4...v3.8.5) (2025-12-22)

### Bug Fixes

* remove BM25 codebase indexing feature ([#303](https://github.com/breaking-brake/cc-wf-studio/issues/303)) ([7a5878d](https://github.com/breaking-brake/cc-wf-studio/commit/7a5878dbc73fa7ef15648cf7684382f4b0dc06de))
* remove unused timeout setting and enable proper AI cancellation ([#305](https://github.com/breaking-brake/cc-wf-studio/issues/305)) ([666a231](https://github.com/breaking-brake/cc-wf-studio/commit/666a231745bcfcd314dd9f3bebacbd7b43d4a037))

### Improvements

* prevent dropdown menu from closing on settings selection ([#304](https://github.com/breaking-brake/cc-wf-studio/issues/304)) ([544cc42](https://github.com/breaking-brake/cc-wf-studio/commit/544cc424f0f6e9c8ad1bcca55e81f95323cd13f5))

## [3.8.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.3...v3.8.4) (2025-12-20)

### Improvements

* add tool execution loading animation in AI chat ([#298](https://github.com/breaking-brake/cc-wf-studio/issues/298)) ([5615efe](https://github.com/breaking-brake/cc-wf-studio/commit/5615efe1de5c490924bf03ad26972231f28a6da8))
* AI editing chat enhancements with allowed tools UI and strict tool restrictions ([#299](https://github.com/breaking-brake/cc-wf-studio/issues/299)) ([d72f241](https://github.com/breaking-brake/cc-wf-studio/commit/d72f2411a44b6f03c425f1b7830376765657860d))
* implement TOON format for AI prompts to reduce token consumption ([#297](https://github.com/breaking-brake/cc-wf-studio/issues/297)) ([64fe228](https://github.com/breaking-brake/cc-wf-studio/commit/64fe228ba5e03c6c55731bb1038f8b54da8129af))

## [3.8.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.2...v3.8.3) (2025-12-19)

### Bug Fixes

* clear conversation history and sub-agent flows on workflow reset ([#295](https://github.com/breaking-brake/cc-wf-studio/issues/295)) ([751a479](https://github.com/breaking-brake/cc-wf-studio/commit/751a4792de0444e8097f03f770bb2ad0447f3142))

### Improvements

* use Haiku model for AI naming and description generation ([#294](https://github.com/breaking-brake/cc-wf-studio/issues/294)) ([1314fdc](https://github.com/breaking-brake/cc-wf-studio/commit/1314fdc83d5e446c92c8ab53bf547cfe7900f6f2))

## [3.8.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.1...v3.8.2) (2025-12-18)

### Improvements

* AI refinement UX enhancements ([#292](https://github.com/breaking-brake/cc-wf-studio/issues/292)) ([c40c855](https://github.com/breaking-brake/cc-wf-studio/commit/c40c85576250223bf116256793ce4522e560729c))

## [3.8.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.8.0...v3.8.1) (2025-12-17)

### Bug Fixes

* dialog positioning broken by NodePalette transform ([#290](https://github.com/breaking-brake/cc-wf-studio/issues/290)) ([b1adb8f](https://github.com/breaking-brake/cc-wf-studio/commit/b1adb8fdda690aa9288def8088d29da7325c289f))
* improve JSON parsing to handle nested markdown code blocks ([#289](https://github.com/breaking-brake/cc-wf-studio/issues/289)) ([d0ca208](https://github.com/breaking-brake/cc-wf-studio/commit/d0ca20880ed22a2ed1550746136487015567545d))

## [3.8.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.7.4...v3.8.0) (2025-12-17)

### Features

* structured JSON response format for AI refinement ([#287](https://github.com/breaking-brake/cc-wf-studio/issues/287)) ([d16f74e](https://github.com/breaking-brake/cc-wf-studio/commit/d16f74e184acf9ab95dd985bbe6a0b453b232d2d))

## [3.7.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.7.3...v3.7.4) (2025-12-16)

### Improvements

* add collapsible NodePalette and persist minimap state ([#285](https://github.com/breaking-brake/cc-wf-studio/issues/285)) ([476760a](https://github.com/breaking-brake/cc-wf-studio/commit/476760acd24b4cffd6e5cc2b5e5b8b983a123ff9))

## [3.7.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.7.2...v3.7.3) (2025-12-16)

### Improvements

* consolidate toolbar actions into More dropdown menu ([#283](https://github.com/breaking-brake/cc-wf-studio/issues/283)) ([3b54082](https://github.com/breaking-brake/cc-wf-studio/commit/3b54082c740219865daaa3d3def85897a3fbb567))

## [3.7.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.7.1...v3.7.2) (2025-12-15)

### Improvements

* consolidate AI refinement settings into dropdown menu ([#272](https://github.com/breaking-brake/cc-wf-studio/issues/272)) ([faee579](https://github.com/breaking-brake/cc-wf-studio/commit/faee579b43b4c29df318849b96cd8cf27e15f2aa))

## [3.7.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.7.0...v3.7.1) (2025-12-14)

### Improvements

* add Toggle component and enhance CodebaseSettingsDialog UX ([#270](https://github.com/breaking-brake/cc-wf-studio/issues/270)) ([da9dcc4](https://github.com/breaking-brake/cc-wf-studio/commit/da9dcc493b0732c4f9858827b45af86ef78906a6))
* remove excessive emojis from CodebaseSettingsDialog ([#268](https://github.com/breaking-brake/cc-wf-studio/issues/268)) ([69b3a32](https://github.com/breaking-brake/cc-wf-studio/commit/69b3a32544aa0b919513a3229568ceca211924b1))

## [3.7.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.6.1...v3.7.0) (2025-12-13)

### Features

* add local codebase indexing with BM25 full-text search ([#265](https://github.com/breaking-brake/cc-wf-studio/issues/265)) ([#266](https://github.com/breaking-brake/cc-wf-studio/issues/266)) ([a0fa749](https://github.com/breaking-brake/cc-wf-studio/commit/a0fa7496a86a4b6c031d353afe2f9a67a95d2a7b))

## [3.6.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.6.0...v3.6.1) (2025-12-13)

### Improvements

* add model, tools, and color settings to SubAgentFlow nodes ([#262](https://github.com/breaking-brake/cc-wf-studio/issues/262)) ([0010dca](https://github.com/breaking-brake/cc-wf-studio/commit/0010dca14eb307ebc9f7350c516ec7f187f851c9))
* reduce MiniMap vertical margin ([#263](https://github.com/breaking-brake/cc-wf-studio/issues/263)) ([6ce42f5](https://github.com/breaking-brake/cc-wf-studio/commit/6ce42f5f7772b2f0129efa1ae60f52192c8d1c62))

## [3.6.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.6...v3.6.0) (2025-12-12)

### Features

* add TOON schema format for AI prompt optimization ([#260](https://github.com/breaking-brake/cc-wf-studio/issues/260)) ([5c99416](https://github.com/breaking-brake/cc-wf-studio/commit/5c99416a6e4c98b76ce8930f47badb6228e526d4))

## [3.5.6](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.5...v3.5.6) (2025-12-12)

### Bug Fixes

* include SubAgentFlows in Slack workflow export ([#255](https://github.com/breaking-brake/cc-wf-studio/issues/255)) ([38e11e0](https://github.com/breaking-brake/cc-wf-studio/commit/38e11e0b30400370ead4621aea9f920a5bd596dd))

### Improvements

* add minimap visibility toggle with container UI ([#257](https://github.com/breaking-brake/cc-wf-studio/issues/257)) ([6eaf579](https://github.com/breaking-brake/cc-wf-studio/commit/6eaf5791e97ff013e7b811139e3b199212ccbe31))

## [3.5.5](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.4...v3.5.5) (2025-12-11)

### Bug Fixes

* enable keyboard copy-paste in flow name editing fields ([#253](https://github.com/breaking-brake/cc-wf-studio/issues/253)) ([0173783](https://github.com/breaking-brake/cc-wf-studio/commit/01737836bfbc729bf21f1dd30699317277f21a17))

## [3.5.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.3...v3.5.4) (2025-12-11)

### Bug Fixes

* auto-generate SubAgentFlow definitions for AI-created nodes ([#251](https://github.com/breaking-brake/cc-wf-studio/issues/251)) ([4ae3c43](https://github.com/breaking-brake/cc-wf-studio/commit/4ae3c433282761500fe9b94e071cbb0a2ca4001a))

## [3.5.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.2...v3.5.3) (2025-12-10)

### Bug Fixes

* preserve SubAgentFlow references when opening AI edit dialog ([#248](https://github.com/breaking-brake/cc-wf-studio/issues/248)) ([443aa1a](https://github.com/breaking-brake/cc-wf-studio/commit/443aa1a08746a0a942cf9218e441afb4f1272eda))
* prevent SubAgentFlow canvas overwrite when opening AI edit dialog ([#249](https://github.com/breaking-brake/cc-wf-studio/issues/249)) ([f6835a8](https://github.com/breaking-brake/cc-wf-studio/commit/f6835a8c102affd9e63d570084cc2126f1b6f869))

## [3.5.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.1...v3.5.2) (2025-12-10)

### Improvements

* add ellipsis truncation for workflow name fields ([#246](https://github.com/breaking-brake/cc-wf-studio/issues/246)) ([3ff63d6](https://github.com/breaking-brake/cc-wf-studio/commit/3ff63d6ab01126b11bd8f5683d2d66c4d2a8d0fe))

## [3.5.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.5.0...v3.5.1) (2025-12-09)

### Improvements

* replace workflow dropdown with OS file picker ([#244](https://github.com/breaking-brake/cc-wf-studio/issues/244)) ([276377c](https://github.com/breaking-brake/cc-wf-studio/commit/276377c00d2b7271fefac94691524f5ef0351006))

## [3.5.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.4.1...v3.5.0) (2025-12-09)

### Features

* add AI editing functionality to SubAgentFlow dialog ([#242](https://github.com/breaking-brake/cc-wf-studio/issues/242)) ([16bf7d5](https://github.com/breaking-brake/cc-wf-studio/commit/16bf7d51f32c8c1ee83038bb6bcde5a3d6469299))

## [3.4.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.4.0...v3.4.1) (2025-12-08)

### Bug Fixes

* hide unsupported nodes in SubAgentFlow edit mode ([#230](https://github.com/breaking-brake/cc-wf-studio/issues/230)) ([e595d37](https://github.com/breaking-brake/cc-wf-studio/commit/e595d376fe541d8dd4d54652a7a76e7964230bbd))
* update SubAgentFlow name on canvas after editing ([#233](https://github.com/breaking-brake/cc-wf-studio/issues/233)) ([2419d7c](https://github.com/breaking-brake/cc-wf-studio/commit/2419d7c8f670aa74152336f91e8f0c5457fc7721))

### Improvements

* add AI name generation to SubAgentFlow dialog ([#232](https://github.com/breaking-brake/cc-wf-studio/issues/232)) ([0059d03](https://github.com/breaking-brake/cc-wf-studio/commit/0059d03fa19ed485194775738e12f7e45e871062))

## [3.4.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.3.0...v3.4.0) (2025-12-07)

### Features

* add Sub-Agent Flow support (Beta) ([#228](https://github.com/breaking-brake/cc-wf-studio/issues/228)) ([5730908](https://github.com/breaking-brake/cc-wf-studio/commit/573090810930d00c30ab64220492ed3c8df6a8d7))

## [3.3.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.2.4...v3.3.0) (2025-12-06)

### Features

* add close button to PropertyPanel with tour highlight fix ([#226](https://github.com/breaking-brake/cc-wf-studio/issues/226)) ([0004663](https://github.com/breaking-brake/cc-wf-studio/commit/0004663bf9990d63696b7af6da02b6ad84e0a954))
* add workflow reset button to toolbar ([#225](https://github.com/breaking-brake/cc-wf-studio/issues/225)) ([2b8fb54](https://github.com/breaking-brake/cc-wf-studio/commit/2b8fb5410c8ef8af997249b82b2a7dfffa0d118f))

## [3.2.4](https://github.com/breaking-brake/cc-wf-studio/compare/v3.2.3...v3.2.4) (2025-12-06)

### Bug Fixes

* add responsive design to NodePalette ([#223](https://github.com/breaking-brake/cc-wf-studio/issues/223)) ([39432af](https://github.com/breaking-brake/cc-wf-studio/commit/39432afc60100a4c8a68bd66d72f315fc1d66d0a))

## [3.2.3](https://github.com/breaking-brake/cc-wf-studio/compare/v3.2.2...v3.2.3) (2025-12-05)

### Bug Fixes

* add responsive layout for toolbar and canvas elements ([#221](https://github.com/breaking-brake/cc-wf-studio/issues/221)) ([e3ce419](https://github.com/breaking-brake/cc-wf-studio/commit/e3ce4190a94a1e642430617ef06662f179491fd7))

## [3.2.2](https://github.com/breaking-brake/cc-wf-studio/compare/v3.2.1...v3.2.2) (2025-12-04)

### Bug Fixes

* add responsive design to RefinementChatPanel ([#219](https://github.com/breaking-brake/cc-wf-studio/issues/219)) ([82f1949](https://github.com/breaking-brake/cc-wf-studio/commit/82f194950484da8722a9640e5f80cec9d53ada6c))

## [3.2.1](https://github.com/breaking-brake/cc-wf-studio/compare/v3.2.0...v3.2.1) (2025-12-04)

### Bug Fixes

* remove redundant 'Node' suffix from property panel node type labels ([#217](https://github.com/breaking-brake/cc-wf-studio/issues/217)) ([4e23854](https://github.com/breaking-brake/cc-wf-studio/commit/4e23854ebd140f86c02266bb37f8c6c6c5a41d0e))

## [3.2.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.1.0...v3.2.0) (2025-12-03)

### Features

* add AI-assisted workflow name generation ([#215](https://github.com/breaking-brake/cc-wf-studio/issues/215)) ([de76472](https://github.com/breaking-brake/cc-wf-studio/commit/de764721b295c9b910cf671e8e45311fad173ad6))

## [3.1.0](https://github.com/breaking-brake/cc-wf-studio/compare/v3.0.0...v3.1.0) (2025-12-03)

### Features

* add AI-assisted description generation for Slack sharing ([#212](https://github.com/breaking-brake/cc-wf-studio/issues/212)) ([f41908d](https://github.com/breaking-brake/cc-wf-studio/commit/f41908dbfaad504648731dad9160d1155b647119))

### Code Refactoring

* clean up unused scope validation methods in SlackTokenManager ([#210](https://github.com/breaking-brake/cc-wf-studio/issues/210)) ([5c4c188](https://github.com/breaking-brake/cc-wf-studio/commit/5c4c1887d96b2f29e38c3ea7b8b8c6c747d4fe04)), closes [#172](https://github.com/breaking-brake/cc-wf-studio/issues/172)

## [3.0.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.17.4...v3.0.0) (2025-12-02)

### ⚠ BREAKING CHANGES

* License changed from MIT to AGPL-3.0-or-later

### Miscellaneous Chores

* change license from MIT to AGPL-3.0 ([#208](https://github.com/breaking-brake/cc-wf-studio/issues/208)) ([6553eb8](https://github.com/breaking-brake/cc-wf-studio/commit/6553eb8880fa751d74fa3f878c54ad92509c5915))

## [2.17.4](https://github.com/breaking-brake/cc-wf-studio/compare/v2.17.3...v2.17.4) (2025-12-02)

### Bug Fixes

* display User Token Scopes as list with permission reasons ([#202](https://github.com/breaking-brake/cc-wf-studio/issues/202)) ([90284d1](https://github.com/breaking-brake/cc-wf-studio/commit/90284d1c65e199b10ade7516ac7f6507aa333d0d))

## [2.17.3](https://github.com/breaking-brake/cc-wf-studio/compare/v2.17.2...v2.17.3) (2025-12-01)

### Bug Fixes

* remove Author display and users:read scope from Slack sharing ([#187](https://github.com/breaking-brake/cc-wf-studio/issues/187)) ([17aaa83](https://github.com/breaking-brake/cc-wf-studio/commit/17aaa835467800c7cd755bf1146678ad191d8d61))
* remove Bot Token required check from manual connection ([#189](https://github.com/breaking-brake/cc-wf-studio/issues/189)) ([18c00d7](https://github.com/breaking-brake/cc-wf-studio/commit/18c00d705e0b9a38f6505253882723b00d752e6e))
* update Slack App setup instructions for User Token only ([#188](https://github.com/breaking-brake/cc-wf-studio/issues/188)) ([a8e4463](https://github.com/breaking-brake/cc-wf-studio/commit/a8e44636736a8c0adeb9a6a868da2c090cfce11d))

## [2.17.2](https://github.com/breaking-brake/cc-wf-studio/compare/v2.17.1...v2.17.2) (2025-12-01)

### Bug Fixes

* migrate Slack integration from Bot Token to User Token ([#185](https://github.com/breaking-brake/cc-wf-studio/issues/185)) ([a6d2ce9](https://github.com/breaking-brake/cc-wf-studio/commit/a6d2ce90e14820a8aaa890c303a7ab74a7bf5544))

## [2.17.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.17.0...v2.17.1) (2025-11-30)

### Bug Fixes

* add i18n support for Slack error messages ([#183](https://github.com/breaking-brake/cc-wf-studio/issues/183)) ([11b8e3d](https://github.com/breaking-brake/cc-wf-studio/commit/11b8e3dfb5037b6ee534cc9361a006ccacf9ef7d))

## [2.17.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.16.1...v2.17.0) (2025-11-30)

### Features

* add Terms of Service link to Slack connection dialog ([#179](https://github.com/breaking-brake/cc-wf-studio/issues/179)) ([6783507](https://github.com/breaking-brake/cc-wf-studio/commit/67835074e3e8a2c9c61959806d3a72455a953fe0))
* display Slack author as clickable mention ([#180](https://github.com/breaking-brake/cc-wf-studio/issues/180)) ([60f220f](https://github.com/breaking-brake/cc-wf-studio/commit/60f220f284c71ece653228758c5364bb4b2b1110))

### Bug Fixes

* update token deletion wording to use auth token ([#178](https://github.com/breaking-brake/cc-wf-studio/issues/178)) ([bcc94d0](https://github.com/breaking-brake/cc-wf-studio/commit/bcc94d00ac05a1989d2c27d56b6ba3bc4d9471b5))
* use User Token for bot membership check ([#181](https://github.com/breaking-brake/cc-wf-studio/issues/181)) ([bd65809](https://github.com/breaking-brake/cc-wf-studio/commit/bd65809e95b41aabad5df9d44bd3e4d0cd55cbc7))

## [2.16.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.16.0...v2.16.1) (2025-11-30)

### Bug Fixes

* require User Token for manual Slack connection ([#175](https://github.com/breaking-brake/cc-wf-studio/issues/175)) ([8904134](https://github.com/breaking-brake/cc-wf-studio/commit/8904134ded9e18e5346357eae5d2b01c9c896917))

## [2.16.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.15.1...v2.16.0) (2025-11-29)

### Features

* improve Slack sharing with User Token and bot membership check ([#173](https://github.com/breaking-brake/cc-wf-studio/issues/173)) ([48d61b2](https://github.com/breaking-brake/cc-wf-studio/commit/48d61b2bb4c479ffaf9383fa67e3e54763d1e63a))

## [2.15.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.15.0...v2.15.1) (2025-11-29)

### Bug Fixes

* improve Slack import error handling and add files:read scope ([#169](https://github.com/breaking-brake/cc-wf-studio/issues/169)) ([740eef3](https://github.com/breaking-brake/cc-wf-studio/commit/740eef32741db225c839159b873926319c70d1d8))

## [2.15.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.14.1...v2.15.0) (2025-11-28)

### Features

* add default branch to Switch node ([#166](https://github.com/breaking-brake/cc-wf-studio/issues/166)) ([82b164b](https://github.com/breaking-brake/cc-wf-studio/commit/82b164b970cf9fdc9cfe03226867d53a6cdd3141))
* add Slack OAuth authentication flow ([#167](https://github.com/breaking-brake/cc-wf-studio/issues/167)) ([7b49a5e](https://github.com/breaking-brake/cc-wf-studio/commit/7b49a5e9369e24598b4e5918d26ddef6d3f61249))

## [2.14.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.14.0...v2.14.1) (2025-11-27)

### Bug Fixes

* add refresh button to Skill Browser dialog ([#163](https://github.com/breaking-brake/cc-wf-studio/issues/163)) ([41ac722](https://github.com/breaking-brake/cc-wf-studio/commit/41ac722d3fc5071fe62822554c1f829bee968505))

## [2.14.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.13.3...v2.14.0) (2025-11-26)

### Features

* add multi-editor import support for Slack workflow sharing ([#158](https://github.com/breaking-brake/cc-wf-studio/issues/158)) ([00faefa](https://github.com/breaking-brake/cc-wf-studio/commit/00faefa3e44a28feced2e0cd0e0f17492039c43b))

## [2.13.3](https://github.com/breaking-brake/cc-wf-studio/compare/v2.13.2...v2.13.3) (2025-11-26)

### Bug Fixes

* improve badge and description text visibility across UI ([#156](https://github.com/breaking-brake/cc-wf-studio/issues/156)) ([325c6bb](https://github.com/breaking-brake/cc-wf-studio/commit/325c6bbb7073e2b1f881e9d51393bc782d393e07))

## [2.13.2](https://github.com/breaking-brake/cc-wf-studio/compare/v2.13.1...v2.13.2) (2025-11-25)

### Bug Fixes

* improve error message when no workspace is open ([#153](https://github.com/breaking-brake/cc-wf-studio/issues/153)) ([08d8278](https://github.com/breaking-brake/cc-wf-studio/commit/08d82785e3c186e9b70d2033c2c8abe29bdb2b29))
* improve node palette description text visibility ([#154](https://github.com/breaking-brake/cc-wf-studio/issues/154)) ([a17728b](https://github.com/breaking-brake/cc-wf-studio/commit/a17728b67e929c7858aa8fd710e928c9ff79d8e7))

## [2.13.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.13.0...v2.13.1) (2025-11-25)

### Bug Fixes

* add MCP server refresh button to resolve cache issue ([#151](https://github.com/breaking-brake/cc-wf-studio/issues/151)) ([0c42c9b](https://github.com/breaking-brake/cc-wf-studio/commit/0c42c9b49e138cfc5edd8250262b61d9f8558a9a))

## [2.13.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.12.2...v2.13.0) (2025-11-24)

### Features

* add Terms of Use dialog with onboarding tour integration ([#148](https://github.com/breaking-brake/cc-wf-studio/issues/148)) ([fae4334](https://github.com/breaking-brake/cc-wf-studio/commit/fae43340776314f0dfc67008971ea4362ba0197a))

### Bug Fixes

* correct ConnectSlackManualPayload type definition to match implementation ([#147](https://github.com/breaking-brake/cc-wf-studio/issues/147)) ([735033b](https://github.com/breaking-brake/cc-wf-studio/commit/735033b6c9593f50f0d6b72bb7e5235019087d00))

### Code Refactoring

* migrate onboarding tour from react-joyride to driver.js ([#146](https://github.com/breaking-brake/cc-wf-studio/issues/146)) ([62641b8](https://github.com/breaking-brake/cc-wf-studio/commit/62641b85c3d97399c2fefa34586ab9977db3fc4e))

## [2.12.2](https://github.com/breaking-brake/cc-wf-studio/compare/v2.12.1...v2.12.2) (2025-11-24)

### Bug Fixes

* clear all Slack client cache on token update and disconnect ([#143](https://github.com/breaking-brake/cc-wf-studio/issues/143)) ([4ab26dd](https://github.com/breaking-brake/cc-wf-studio/commit/4ab26dd0fe1f38bb31491ebb56844602747c84a2))

### Documentation

* add Slack sharing demo GIFs and reorganize Key Features ([#142](https://github.com/breaking-brake/cc-wf-studio/issues/142)) ([9ef4d05](https://github.com/breaking-brake/cc-wf-studio/commit/9ef4d059483f75038568e983edb1fc9342e62364))

## [2.12.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.12.0...v2.12.1) (2025-11-24)

### Bug Fixes

* resolve Slack import issues and improve setup instructions ([#140](https://github.com/breaking-brake/cc-wf-studio/issues/140)) ([bd264b9](https://github.com/breaking-brake/cc-wf-studio/commit/bd264b938dc8f2934ae4e18e6da4c5ed45031caa))

## [2.12.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.11.2...v2.12.0) (2025-11-23)

### Features

* add Slack Workflow Sharing (β) ([#138](https://github.com/breaking-brake/cc-wf-studio/issues/138)) ([a0d34de](https://github.com/breaking-brake/cc-wf-studio/commit/a0d34de6234578db63efb0aeee28c039286d08ce))

## [2.11.2](https://github.com/breaking-brake/cc-wf-studio/compare/v2.11.1...v2.11.2) (2025-11-22)

### Bug Fixes

* enable copy-paste in dialog inputs ([#134](https://github.com/breaking-brake/cc-wf-studio/issues/134)) ([c68ef6b](https://github.com/breaking-brake/cc-wf-studio/commit/c68ef6b2032bdda4588dccf2351a47aceeb90346))

## [2.11.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.11.0...v2.11.1) (2025-11-21)

### Bug Fixes

* add missing MCP node definition to workflow schema ([#128](https://github.com/breaking-brake/cc-wf-studio/issues/128)) ([14f68ae](https://github.com/breaking-brake/cc-wf-studio/commit/14f68ae7aeb10af40f46367c826772a38ca14ee5))
* allow empty parameters for MCP tools without parameters ([#130](https://github.com/breaking-brake/cc-wf-studio/issues/130)) ([f0e52cd](https://github.com/breaking-brake/cc-wf-studio/commit/f0e52cdd4061466c97e9d9f2e3eae1c170b8e441))

## [2.11.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.10.0...v2.11.0) (2025-11-21)

### Features

* improve Export button clarity by renaming to Convert ([#126](https://github.com/breaking-brake/cc-wf-studio/issues/126)) ([aa65d61](https://github.com/breaking-brake/cc-wf-studio/commit/aa65d61584481ea0fc00ab975b02b6f5422c2822))

## [2.10.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.9.0...v2.10.0) (2025-11-21)

### Features

* add color property to SubAgent nodes ([#124](https://github.com/breaking-brake/cc-wf-studio/issues/124)) ([65f4e0b](https://github.com/breaking-brake/cc-wf-studio/commit/65f4e0bba8d1282cdee99915c87e2e26b85eb577))

## [2.9.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.8.0...v2.9.0) (2025-11-20)

### Features

* add prompt preview to SubAgentNode canvas display ([#118](https://github.com/breaking-brake/cc-wf-studio/issues/118)) ([25f5ad6](https://github.com/breaking-brake/cc-wf-studio/commit/25f5ad600dc5ce3300940fe90485d374d28af011))

### Bug Fixes

* simplify PromptNode canvas display style ([#120](https://github.com/breaking-brake/cc-wf-studio/issues/120)) ([73d6a55](https://github.com/breaking-brake/cc-wf-studio/commit/73d6a55b0b71a7268d23282d9c32dcd5af1f1fb3))
* unify prompt terminology and rename translation keys ([#119](https://github.com/breaking-brake/cc-wf-studio/issues/119)) ([c616374](https://github.com/breaking-brake/cc-wf-studio/commit/c61637454048f1978ed7ec25cc325aae80e19323))

## [2.8.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.7.4...v2.8.0) (2025-11-20)

### Features

* add canvas interaction mode toggle (pan/selection) ([#116](https://github.com/breaking-brake/cc-wf-studio/issues/116)) ([6d5f4be](https://github.com/breaking-brake/cc-wf-studio/commit/6d5f4be83803d4ce8839537f4d2a8a253e6e4ca8))

## [2.7.4](https://github.com/breaking-brake/cc-wf-studio/compare/v2.7.3...v2.7.4) (2025-11-19)

### Bug Fixes

* support MCP server config in .claude.json.projects scope ([#113](https://github.com/breaking-brake/cc-wf-studio/issues/113)) ([208b870](https://github.com/breaking-brake/cc-wf-studio/commit/208b870858626018707875ba03c72bcda05be528))

## [2.7.3](https://github.com/breaking-brake/cc-wf-studio/compare/v2.7.2...v2.7.3) (2025-11-19)

### Bug Fixes

* close AI refinement panel when node is clicked to show property panel ([#111](https://github.com/breaking-brake/cc-wf-studio/issues/111)) ([fda839e](https://github.com/breaking-brake/cc-wf-studio/commit/fda839ed03bbed59ba1a7efb260b6eddbc0072cb))

## [2.7.2](https://github.com/breaking-brake/cc-wf-studio/compare/v2.7.1...v2.7.2) (2025-11-19)

### Bug Fixes

* reset export button state when user cancels overwrite dialog ([#105](https://github.com/breaking-brake/cc-wf-studio/issues/105)) ([8b945c3](https://github.com/breaking-brake/cc-wf-studio/commit/8b945c3d6460036eac8bbefe4502ace49376a281))
* skip Snyk scan for Dependabot PRs to prevent authentication errors ([#103](https://github.com/breaking-brake/cc-wf-studio/issues/103)) ([38fda5d](https://github.com/breaking-brake/cc-wf-studio/commit/38fda5dd8d0210001d5dd8dec7a9951d7653c8da))
* update biome schema and package-lock version to match package.json ([#104](https://github.com/breaking-brake/cc-wf-studio/issues/104)) ([02d71bc](https://github.com/breaking-brake/cc-wf-studio/commit/02d71bcbbadd31f26f781ec7c84fa3b531d574bc)), closes [#93](https://github.com/breaking-brake/cc-wf-studio/issues/93) [#93](https://github.com/breaking-brake/cc-wf-studio/issues/93)

## [2.7.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.7.0...v2.7.1) (2025-11-18)

### Bug Fixes

* remove MCP documentation URL from empty state display ([#101](https://github.com/breaking-brake/cc-wf-studio/issues/101)) ([f949212](https://github.com/breaking-brake/cc-wf-studio/commit/f94921240731e99166ee017a3edb675bfcfba5c6))

## [2.7.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.6.0...v2.7.0) (2025-11-18)

### Features

* improve MCP Tool node UI text clarity and add documentation hint ([#97](https://github.com/breaking-brake/cc-wf-studio/issues/97)) ([7bcf669](https://github.com/breaking-brake/cc-wf-studio/commit/7bcf6694ba5c90e32565921b916dd7fe14506276)), closes [#88](https://github.com/breaking-brake/cc-wf-studio/issues/88)

## [2.6.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.5.1...v2.6.0) (2025-11-17)

### Features

* integrate Snyk security scanning for dependency vulnerability detection ([ce75878](https://github.com/breaking-brake/cc-wf-studio/commit/ce7587817cb1c5211aafb8160e48373b81e15c70)), closes [#80](https://github.com/breaking-brake/cc-wf-studio/issues/80) [#80](https://github.com/breaking-brake/cc-wf-studio/issues/80)

### Bug Fixes

* update CodeQL Action from v3 to v4 to avoid deprecation warning ([c1c969c](https://github.com/breaking-brake/cc-wf-studio/commit/c1c969c963e3ac618b2978762d2b3c10e21a7f18))

## [2.5.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.5.0...v2.5.1) (2025-11-16)

### Bug Fixes

* Windows compatibility for AI generation features ([#83](https://github.com/breaking-brake/cc-wf-studio/issues/83)) ([fd919bb](https://github.com/breaking-brake/cc-wf-studio/commit/fd919bb9e4a50c5482735d6b5718aeeb7e639baf)), closes [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79) [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79) [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79) [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79) [#3838](https://github.com/breaking-brake/cc-wf-studio/issues/3838) [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79) [#79](https://github.com/breaking-brake/cc-wf-studio/issues/79)

## [2.5.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.4.0...v2.5.0) (2025-11-16)

### Features

* add MCP natural language mode support ([#81](https://github.com/breaking-brake/cc-wf-studio/issues/81)) ([0135e36](https://github.com/breaking-brake/cc-wf-studio/commit/0135e3672ca9b16796043452d6affd5acc15476e))

## [2.4.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.3.0...v2.4.0) (2025-11-15)

### Features

* add indeterminate progress bar for MCP tool loading ([7b43b5c](https://github.com/breaking-brake/cc-wf-studio/commit/7b43b5c6e414d09276e5e6d5b6834bbe6eb1713b))
* add indeterminate progress bar for MCP tool schema loading ([9a52855](https://github.com/breaking-brake/cc-wf-studio/commit/9a528556d399dc399ec6864a91d3bfc573d7a044))

### Code Refactoring

* extract IndeterminateProgressBar as shared component ([c880d45](https://github.com/breaking-brake/cc-wf-studio/commit/c880d45290e207b7674d5e621ad2dd5c5d400872))

## [2.3.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.2.1...v2.3.0) (2025-11-15)

### Features

* add indeterminate progress bar for MCP server loading ([7a4c47b](https://github.com/breaking-brake/cc-wf-studio/commit/7a4c47b40d0f4c6abbd0e7da856ac7d42cd4c690))

### Bug Fixes

* improve MCP tool dialog visibility and F5 debug configuration ([41a1ab8](https://github.com/breaking-brake/cc-wf-studio/commit/41a1ab88244aaf502d04649f4bbefa9700d80a6a))

### Documentation

* clarify MCP network connectivity requirements ([376cc44](https://github.com/breaking-brake/cc-wf-studio/commit/376cc44589a1bd74d5cd000f458bdeba634200d9))

## [2.2.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.2.0...v2.2.1) (2025-11-15)

### Bug Fixes

* bundle extension with Vite to include MCP SDK dependencies ([f3a2878](https://github.com/breaking-brake/cc-wf-studio/commit/f3a2878832fa8220e438e7c69befe4850a4a4a29))

## [2.2.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.2.0) (2025-11-15)

### Features

* **MCP Tool Node Integration** - Complete implementation of Model Context Protocol tool nodes
  * MCPサーバー自動検出とツール一覧表示
  * ツール検索・フィルタリング機能
  * JSON Schemaベースの動的パラメータフォーム生成（5種類の型対応）
  * リアルタイムバリデーション
  * Slash Commandへの完全なエクスポート対応
  * 5言語対応（en, ja, ko, zh-CN, zh-TW）

### Bug Fixes

* prevent tag conflict by using @semantic-release/exec for webview sync ([bfaf0cf](https://github.com/breaking-brake/cc-wf-studio/commit/bfaf0cfa66292fbeb760d7981d421b477bcd1302))

### Documentation

* add Semantic Release and GitHub Actions automation guide to CLAUDE.md

## [2.1.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.1.0) (2025-11-15)

### Features

* **001-mcp-node:** MCPノード機能の仕様と実装計画を作成 ([dd14a41](https://github.com/breaking-brake/cc-wf-studio/commit/dd14a41ef8e5fdf68df6a932710bfdbb986414b3))
* **001-mcp-node:** Phase 1完了 - セットアップ ([3400cc7](https://github.com/breaking-brake/cc-wf-studio/commit/3400cc782d21f85b8d4465daf61d115dd9ea704d))
* **001-mcp-node:** Phase 2完了 - 基盤実装 ([d604444](https://github.com/breaking-brake/cc-wf-studio/commit/d604444ebccabab9edebbbac95a618c69f7a22bd))
* **001-mcp-node:** Phase 5完了 - MCPノードのエクスポート処理と国際化対応を実装 ([0cf3dcc](https://github.com/breaking-brake/cc-wf-studio/commit/0cf3dcc1fef8c10f0d2a1ee13c717cb4bcd572aa))
* **001-mcp-node:** Phase 6完了 - ドキュメント整備と総合テスト完了 ([60491fd](https://github.com/breaking-brake/cc-wf-studio/commit/60491fd603366472eb14d509e1fc11d5e9b959b8))
* **001-mcp-node:** T018-T021 Extension側MCPメッセージハンドラとCLI実装 ([f5dd4ff](https://github.com/breaking-brake/cc-wf-studio/commit/f5dd4ffe1122027459a120ff9b7a52418f0855cc))
* **001-mcp-node:** T022-T027 Webview側MCPノードUI実装 ([99c14df](https://github.com/breaking-brake/cc-wf-studio/commit/99c14dfc81adb34a83eb7753cece4af9cbcf818a))
* **001-mcp-node:** 実装タスクリスト(tasks.md)を作成 ([df28cfa](https://github.com/breaking-brake/cc-wf-studio/commit/df28cfa345b38b70425296a4723bb43572239200))
* add automatic release workflow with semantic-release ([95e08f5](https://github.com/breaking-brake/cc-wf-studio/commit/95e08f57ffbb810c1cfbddd661c8fcbd4b46ab98))
* add automatic sync from production to main after release ([b0ed08b](https://github.com/breaking-brake/cc-wf-studio/commit/b0ed08bb8116fa59a64b6c8eef412057a30b7f46))
* MCP SDKを使用した直接接続によるツール一覧取得を実装 ([dde6982](https://github.com/breaking-brake/cc-wf-studio/commit/dde6982baac7f3397c21abaf725ac8577e50a47b))
* **mcp-node:** implement parameter configuration UI (T031-T038) ([9eed706](https://github.com/breaking-brake/cc-wf-studio/commit/9eed7067e3ae042993f905062b18809e04ce9b31))
* **mcp-node:** implement tool schema retrieval and JSON Schema parser (T028-T030) ([8b692d4](https://github.com/breaking-brake/cc-wf-studio/commit/8b692d4d742788b59958ae4e50ae4ec68c0032ed))

### Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([93b5ead](https://github.com/breaking-brake/cc-wf-studio/commit/93b5ead5dbc37dc314a11a01b57e899f2255d0ef))
* build and package vsix with correct version after semantic-release ([0ce6ca4](https://github.com/breaking-brake/cc-wf-studio/commit/0ce6ca4e39e7c8853fa969ac0ba71af545bc0661))
* format, lint, check修正 ([36d6505](https://github.com/breaking-brake/cc-wf-studio/commit/36d650538faddf5069ed691bb9f7fd038eb78156))
* **mcp-node:** add MCP node support to PropertyPanel ([b64d35b](https://github.com/breaking-brake/cc-wf-studio/commit/b64d35b0a044c66b7a1f36072eba5f6e0df773e8))
* **mcp-node:** resolve lint and type errors in Phase 4 implementation ([9425a13](https://github.com/breaking-brake/cc-wf-studio/commit/9425a13f85b13fbc82e469f2c4a7939050d7d86c))
* MCPツール取得エラーの詳細ログを追加 ([bd2461c](https://github.com/breaking-brake/cc-wf-studio/commit/bd2461c3207b074fe4d7d23333f0fd27f880e492))
* MCP設定のtype自動推論と翻訳の改善 ([9d6f04c](https://github.com/breaking-brake/cc-wf-studio/commit/9d6f04c28eaf8ecf868972be70a596435c93a708))
* MCP設定ファイル読み込みとワークスペース対応を修正 ([63cf48b](https://github.com/breaking-brake/cc-wf-studio/commit/63cf48bf84dcaeebe961b5935861a9f653618377))
* production→main同期でリリースコミットが含まれない問題を修正 ([e938486](https://github.com/breaking-brake/cc-wf-studio/commit/e9384861a618ae8e6c0518b8aa6a44bb1916cadb))
* README.mdでGitHub Issue番号として誤認識される問題を修正 ([c413572](https://github.com/breaking-brake/cc-wf-studio/commit/c413572f845709a8b942eada7a2160c1e32044b5)), closes [1/#2](https://github.com/1/cc-wf-studio/issues/2)
* remove main branch from release workflow trigger ([9c878ef](https://github.com/breaking-brake/cc-wf-studio/commit/9c878effc313fd87bcab71eebc873175e44ae6e3))
* TypeScript型定義の整合性を修正 ([8e0c091](https://github.com/breaking-brake/cc-wf-studio/commit/8e0c09181ee24b4e25aa3b4c032b8f0877489b15))

### Documentation

* **001-mcp-node:** 手動E2Eテストタスクを追加 ([5f5938a](https://github.com/breaking-brake/cc-wf-studio/commit/5f5938af1bd713d663db458bbd8d81f88b5b1cab))
* add Semantic Release and GitHub Actions automation guide to CLAUDE.md ([2efe70f](https://github.com/breaking-brake/cc-wf-studio/commit/2efe70ff9d249e78357efa7b26d5de64e87bc86b))

### Code Refactoring

* **mcp-node:** replan Phase 5 and 6 tasks based on project scope ([4856629](https://github.com/breaking-brake/cc-wf-studio/commit/4856629fe35e0007fc4d737aed4b3a03c018a8d3))
* **mcp-node:** simplify MCP node type badge to "MCP Tool" ([3437140](https://github.com/breaking-brake/cc-wf-studio/commit/343714033959bcc2d9eadb8c81ae33e3a27787d5))

## [2.1.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.1.0) (2025-11-15)

### Features

* add automatic release workflow with semantic-release ([95e08f5](https://github.com/breaking-brake/cc-wf-studio/commit/95e08f57ffbb810c1cfbddd661c8fcbd4b46ab98))
* add automatic sync from production to main after release ([b0ed08b](https://github.com/breaking-brake/cc-wf-studio/commit/b0ed08bb8116fa59a64b6c8eef412057a30b7f46))

### Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([93b5ead](https://github.com/breaking-brake/cc-wf-studio/commit/93b5ead5dbc37dc314a11a01b57e899f2255d0ef))
* build and package vsix with correct version after semantic-release ([0ce6ca4](https://github.com/breaking-brake/cc-wf-studio/commit/0ce6ca4e39e7c8853fa969ac0ba71af545bc0661))
* remove main branch from release workflow trigger ([9c878ef](https://github.com/breaking-brake/cc-wf-studio/commit/9c878effc313fd87bcab71eebc873175e44ae6e3))
