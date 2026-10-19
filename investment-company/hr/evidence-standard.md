# AI投資会社 人事評価証跡標準 v1.0

## 目的
週次人事評価を後追い推測ではなく、各委員会が日次で残す監査可能な証跡から自動集計できるようにする。

## 日次必須ファイル
- `investment-company/hr/activity/YYYY-MM-DD/market-intelligence.json`
- `investment-company/hr/activity/YYYY-MM-DD/daytrade.json`
- `investment-company/hr/activity/YYYY-MM-DD/market-close-review.json`
- `investment-company/hr/activity/YYYY-MM-DD/performance-review.json`
- `investment-company/hr/activity/YYYY-MM-DD/hr-audit.json`
- `investment-company/hr/daily/YYYY-MM-DD.json`

## agent証跡の必須項目
- agentId
- title
- taskPerformed
- keyFindings
- novelContribution
- decisionImpact
- risksFlagged
- errorsOrMisses
- confidence
- dataLimitations
- sourcesUsed
- duplicationWith
- noMaterialContribution
- backfilled

## 評価原則
1. 参加しただけでは貢献扱いにしない。
2. 株価の事後騰落だけで評価しない。
3. 候補順位、見送り、撤退条件、リスク認識を実際に変えた貢献を重視する。
4. 誤数値、根拠のない断定、未取得値の捏造は重大減点。
5. activityの欠損は可能な範囲で既存成果物からbackfillし、復元不能はevidenceGapとして残す。
6. opportunityCountとevidenceCountを分け、呼ばれていない役割を低評価にしない。
7. 同種の運用欠損が2週連続した場合、No.31の重大改善事項とし、保存経路の構造不備ならNo.1/2も運用統制評価の対象とする。
8. No.31は自己評価しない。

## 引け後の自律監査
16:30のclose reviewで、その日の7:30朝レポート、8:00 daytrade、各activity、前営業日close reviewの存在を監査する。欠損があれば当日中に可能な範囲で補完する。

## 週次評価
毎週月曜19:00に前週の日次証跡を集計し、100点評価とS/A/B/C/D、直近4週間のrollingScoreとtrendを更新する。正式な降格・統合・廃止は原則4週間以上または十分な案件数がある場合のみ行う。
