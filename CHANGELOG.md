## [1.5.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.5.0...v1.5.1) (2024-10-20)


### Bug Fixes

* upgraded example app deps and package details in package json ([3472516](https://github.com/JairajJangle/react-native-tree-multi-select/commit/3472516d3c94613e7b89c1babd0cd45b140b7a78))

# [1.5.0](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.4.1...v1.5.0) (2024-10-13)


### Bug Fixes

* fixed parent does not get unchecked if all children are unchecked at once in filtered tree ([cf2195b](https://github.com/JairajJangle/react-native-tree-multi-select/commit/cf2195b94faa619ecb6a60ae6359e09755342668))
* trigger patch release for refactor ([c3b9a71](https://github.com/JairajJangle/react-native-tree-multi-select/commit/c3b9a71f3d3026b1a6428d65a8209ae8eb05ce30))


### Features

* added prop and state to control parent <-> child selection propagation ([#81](https://github.com/JairajJangle/react-native-tree-multi-select/issues/81)) ([4714525](https://github.com/JairajJangle/react-native-tree-multi-select/commit/47145251fc7fdfbc1437bda336596fea92842226))
* updated toggle checkbox helpers for controlled parent <-> child selection propagation ([#81](https://github.com/JairajJangle/react-native-tree-multi-select/issues/81)) ([9acbca2](https://github.com/JairajJangle/react-native-tree-multi-select/commit/9acbca2b1eb8300cfeaf29ffd37c2d96c93b744d))


### Performance Improvements

* replaced recursive logic with iterative logic to handle tree expand collapse ([b417057](https://github.com/JairajJangle/react-native-tree-multi-select/commit/b4170572068725885cbeaa91659e1c58164208b6))

# [1.5.0-beta.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.5.0-beta.2...v1.5.0-beta.3) (2024-10-13)


### Bug Fixes

* fixed parent does not get unchecked if all children are unchecked at once in filtered tree ([cf2195b](https://github.com/JairajJangle/react-native-tree-multi-select/commit/cf2195b94faa619ecb6a60ae6359e09755342668))


### Performance Improvements

* replaced recursive logic with iterative logic to handle tree expand collapse ([b417057](https://github.com/JairajJangle/react-native-tree-multi-select/commit/b4170572068725885cbeaa91659e1c58164208b6))

# [1.5.0-beta.2](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.5.0-beta.1...v1.5.0-beta.2) (2024-10-12)


### Bug Fixes

* trigger patch release for refactor ([c3b9a71](https://github.com/JairajJangle/react-native-tree-multi-select/commit/c3b9a71f3d3026b1a6428d65a8209ae8eb05ce30))

# [1.5.0-beta.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.4.1...v1.5.0-beta.1) (2024-10-08)


### Features

* added prop and state to control parent <-> child selection propagation ([#81](https://github.com/JairajJangle/react-native-tree-multi-select/issues/81)) ([4714525](https://github.com/JairajJangle/react-native-tree-multi-select/commit/47145251fc7fdfbc1437bda336596fea92842226))
* updated toggle checkbox helpers for controlled parent <-> child selection propagation ([#81](https://github.com/JairajJangle/react-native-tree-multi-select/issues/81)) ([9acbca2](https://github.com/JairajJangle/react-native-tree-multi-select/commit/9acbca2b1eb8300cfeaf29ffd37c2d96c93b744d))

## [1.4.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.4.0...v1.4.1) (2024-08-28)


### Bug Fixes

* turbo pipeline to task renamed ([55a428f](https://github.com/JairajJangle/react-native-tree-multi-select/commit/55a428f6eb88946e4a4d84e9063da408db35ea5e))
* upgraded deps ([0ddd803](https://github.com/JairajJangle/react-native-tree-multi-select/commit/0ddd80392dda389dfe6976ed1cf7a9987f665540))

# [1.4.0](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.3.3...v1.4.0) (2024-08-20)


### Features

* added indeterminate state ids to onCheck callback ([204b9a0](https://github.com/JairajJangle/react-native-tree-multi-select/commit/204b9a0a26e80d2f4c434bc6afdd17452f44fb87))

## [1.3.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.3.2...v1.3.3) (2024-08-03)


### Performance Improvements

* optimized state usage using useShallow and memoization ([0c8d9c6](https://github.com/JairajJangle/react-native-tree-multi-select/commit/0c8d9c66d6239bc6447fef64fee3841f8a2f8620))

## [1.3.2](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.3.1...v1.3.2) (2024-06-09)


### Bug Fixes

* **deps:** update dependency react-native-safe-area-context to v4.10.4 ([89db0eb](https://github.com/JairajJangle/react-native-tree-multi-select/commit/89db0eb44a20d27b2d0e72d4586bdecd29bfef85))

## [1.3.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.3.0...v1.3.1) (2024-05-20)


### Bug Fixes

* workflow action not upgrading package json version ([e51cbd7](https://github.com/JairajJangle/react-native-tree-multi-select/commit/e51cbd78c7790db7d33d2ea6e9b269e0ae51609f))

# [1.3.0](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.8...v1.3.0) (2024-05-20)


### Features

* added ref function to check/uncheck node ids ([caec003](https://github.com/JairajJangle/react-native-tree-multi-select/commit/caec0030f2f19645d9950018ec85f1c5608cff9e))

## [1.2.8](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.7...v1.2.8) (2024-05-11)


### Bug Fixes

* **semantic_release:** remove duplicate release config from package json and updated lock files ([dcf432d](https://github.com/JairajJangle/react-native-tree-multi-select/commit/dcf432dd483a34b2f073b8b898b4b3133eeaa54e))

### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

Generated by [`auto-changelog`](https://github.com/CookPete/auto-changelog).

#### [1.2.6](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.6...1.2.6)

> 6 May 2024

#### [v1.2.6](https://github.com/JairajJangle/react-native-tree-multi-select/compare/1.2.5...v1.2.6)

> 6 May 2024

- chore: updated gh action npm publish steps [`#28`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/28)

#### [1.2.5](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.5...1.2.5)

> 6 May 2024

#### [v1.2.5](https://github.com/JairajJangle/react-native-tree-multi-select/compare/1.2.3...v1.2.5)

> 6 May 2024

- chore: updated gh action to have write permission to contents to allow tag writing [`#27`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/27)
- chore: added permission to npm publish job [`#26`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/26)
- chore: used yarn install instead of npm ci as the yarn lock file is already present [`#25`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/25)
- chore: removed npm install in favor of npm ci in gh action [`#24`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/24)
- chore: updated gh actions to ignore peer deps in npm install [`#23`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/23)
- chore: kept npm package lock in sync before ci [`#22`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/22)
- chore: added npm publish provenance to gh action [`#21`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/21)
- chore: added npm publish provenance to gh action [`#20`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/20)
- Update CHANGELOG.md for version  [skip ci] [`78f3754`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/78f3754408eac30ab6f4225eeff8ffa884334005)

#### [1.2.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.3...1.2.3)

> 6 May 2024

#### [v1.2.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.1...v1.2.3)

> 5 May 2024

- chore: remove unnecessary package json add in github action [`#19`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/19)
- chore: added git pull after cahngelogs push in gh actions [`#18`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/18)
- chore: prevent auto version increment in github actions [`#17`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/17)
- chore: added npm publish to github actions [`#16`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/16)
- Update CHANGELOG.md for version 1.2.3 [skip ci] [`f398a87`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/f398a87833e9014e7f7acdf7637f803a760a8473)
- chore: added auto changelogs package [`837bcd3`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/837bcd3f5a8229a5390433c13ea34b4462d19ed9)

#### [v1.2.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.2.0...v1.2.1)

> 2 May 2024

- Feature/expand collapse control [`#15`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/15)
- build: cleaned build and updated lock files [`363cbd0`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/363cbd0ae59068771e7888d9d50e15623f9bd37c)
- feat: add functions to expand/collapse nodes by ref or pre-expanded ids [`1f8569b`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/1f8569b1519eccbe9935f212140051cbacfcd5cd)
- fix: removed flipper config from example Podfile [`277a16e`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/277a16e6d703df3ae0d2499604ee9861a88b8a29)

#### [v1.2.0](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.1.2...v1.2.0)

> 1 May 2024

- chore: release 1.2.0 [`07badab`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/07badab16f96a33b5db68408eea7ce7d9f1139ba)

#### [v1.1.2](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.1.1...v1.1.2)

> 20 October 2023

- fix: updated nvmrc to use node v20 [`#13`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/13)
- chore(deps): bump @babel/traverse from 7.22.6 to 7.23.2 [`#12`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/12)
- fix: updated broken lock files [`21fdf25`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/21fdf25856cb3ad4201fddaf030f40f57da8ee31)
- chore: updated pod and yarn lock files [`7a8fd1d`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/7a8fd1d822f62a04b9e848f6f789bece06919691)
- chore(deps): bump @babel/traverse from 7.22.6 to 7.23.2 in /example [`3a8860e`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/3a8860ef63722d74f5c62890348f4a1059873008)

#### [v1.1.1](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v1.1.0...v1.1.1)

> 20 July 2023

- fix: fixed code outside src causing built folder path mismatch [`699159f`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/699159fac93ef2e5505d400e9d1096e052eb690c)
- chore: release 1.1.1 [`36c9cef`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/36c9cefc7c457a6e287954c0be63cb1bdb9d261f)

### [v1.1.0](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.11...v1.1.0)

> 20 July 2023

- chore: attempt 2 to fix coverage workflow action [`#9`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/9)
- Prep/release 1 0 0 [`#8`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/8)
- chore(deps): bump word-wrap from 1.2.3 to 1.2.4 [`#5`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/5)
- chore(deps): bump semver from 5.7.1 to 5.7.2 [`#6`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/6)
- Prep/release 1 0 0 [`#4`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/4)
- chore(deps): bump semver from 5.7.1 to 5.7.2 in /example [`#7`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/7)
- chore: replaced hardcoded sample data with dynamically gen data [`a36e177`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/a36e177866f9acaf0f1be1e4c7d605f06fc8c0f4)
- fix: added missing custom screen files [`1809b5d`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/1809b5d61606db401f809eacbba2e020e324a01c)
- feat: added app showcase template for example app [`0000eae`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/0000eaedb3cfd42ffc0983a34ea33a7289a50799)

#### [v0.8.11](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.10...v0.8.11)

> 15 July 2023

- test: added selectAll helpers to test case and made 100% test coverage [`7913f8b`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/7913f8b02ea1a8669628c67585961ed8a29c89a8)
- chore: release 0.8.11 [`163df1b`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/163df1bafe5b605264d1dc6b5076140295e29bcc)

#### [v0.8.10](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.9...v0.8.10)

> 15 July 2023

- test: added test cases for helper functions and zustand store [`20dfaeb`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/20dfaeb684f1abb075d00293c0d3873970c52a26)
- chore: cleanup: seperated some functions from component file into helper file [`10ef9ec`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/10ef9ec02c597e6ab3a9d67f29ccd1fc287d9d4e)
- fix: recursive rendering due to useffect dependency issue [`0df57db`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/0df57db623238fd412affe0373bba30a38e7d103)

#### [v0.8.9](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.8...v0.8.9)

> 12 July 2023

- chore: corrected checkbox view style prop types and updated readme [`101a600`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/101a600765aa97d10d63dd0272e666e1e9ce97cb)
- chore: release 0.8.9 [`c09d1db`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/c09d1db64ddeb86637b4dbc48a28d98f4d55cca3)

#### [v0.8.8](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.7...v0.8.8)

> 12 July 2023

- chore: removed unnecessary native files and added indentation multiplier customization prop [`409acc5`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/409acc5acbe6c0d4694e968bcc2f617e6a9cf26a)
- chore: release 0.8.8 [`76ca8ab`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/76ca8abbdce1d0f51335cc1be42c158614161d80)

#### [v0.8.7](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.6...v0.8.7)

> 11 July 2023

- fix: fixed special single child condition check [`a2c40ef`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/a2c40efbdcd8007c148a54aa50c24c131efe4d5d)
- chore: release 0.8.7 [`5f3646f`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/5f3646f8f2ede4463916dc32ca75dfcb4e2ef4e1)

#### [v0.8.6](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.5...v0.8.6)

> 11 July 2023

- chore: cleanup [`5f236fd`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/5f236fd0f62639d60ac3983d68e70a57c664173f)
- chore: types cleanup [`79e1b7b`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/79e1b7bd4b5ff0afa3bf421cf88a036f180dd7d2)
- chore: updated readme [`f6006b7`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/f6006b725b3feffc795b64a7305ccdb5292cf3e9)

#### [v0.8.5](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.8.3...v0.8.5)

> 10 July 2023

- chore: release 0.8.5 [`42c89fe`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/42c89feeabe22a3ddd40302e988502cbc92cd09f)
- chore: version bump [`ad1bd43`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/ad1bd43e1345f016dbcb0226e0918d3eca22d722)
- chore: readme updated [`6275d89`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/6275d895f6722ea0fc574deb113b00a47950e044)

#### [v0.8.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.5.4...v0.8.3)

> 10 July 2023

- fix: transitioned from preact signal to zustand state [`#3`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/3)
- fix: transitioned from preact signal to zustand state due to experimental nature of signals in RN [`a1bf158`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/a1bf15836d1aa916bd62b1015967890775163f56)
- chore: updated readme and version bump [`af493c3`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/af493c31574192f522fff43bb573e4d530b4b363)
- chore: ci ios build failure fixes [`892f621`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/892f621875f44d88fdf18d4d30c9026e0e5620bf)

#### [v0.5.4](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.5.3...v0.5.4)

> 10 July 2023

- chore: updated readme [`0308abc`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/0308abca793bbd2b054503cbe6cea63fa5571396)
- chore: updated readme [`3ee4ec7`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/3ee4ec7fde1b0b584aaa4f5acc340f691ade3a3c)
- chore: release 0.5.4 [`3cc3fd2`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/3cc3fd240e3739875123d2a3fa68fc437909a540)

#### [v0.5.3](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.5.2...v0.5.3)

> 10 July 2023

- chore: updated readme [`7beb85f`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/7beb85f86d64ddc911fa66cc08d26403dbc616b4)
- chore: release 0.5.3 [`d9147ef`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/d9147ef53ced5115d0dda582f96f3d7f59b7f877)

#### [v0.5.2](https://github.com/JairajJangle/react-native-tree-multi-select/compare/v0.5.0...v0.5.2)

> 10 July 2023

- chore: updated keywords to package json [`fce3d13`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/fce3d13014ea14b749aac2cbb6be5857714c9ce6)
- chore: release 0.5.2 [`8a37d68`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/8a37d68faae70a71ec6b147511eab64a916f4ed6)
- chore: version bump [`e5d80f0`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/e5d80f0ffb808fda3bf99485f7ed13147a0f4d2a)

#### v0.5.0

> 10 July 2023

- Significant performance optimizations in tree filtering and selection and some more feature [`#2`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/2)
- Performance improvements and added many features [`#1`](https://github.com/JairajJangle/react-native-tree-multi-select/pull/1)
- chore: updated readme file [`dc183f6`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/dc183f661bf5cd96c4bb67e0af2eac004de97cd0)
- perf: major optimizations and added expand/collapse functionality [`341c982`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/341c982c1f5479f453f6e2b70e66da0f9c52cfca)
- feat: initial commit [`7186ca0`](https://github.com/JairajJangle/react-native-tree-multi-select/commit/7186ca0f677e19672ff0b70ed1616526ae8edd82)
