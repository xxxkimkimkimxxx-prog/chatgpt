# 投資家思考モデル比較・答え合わせ方法 v1.0

## 目的
No.35 初心者投資家モデル、No.36 玄人個人投資家モデル、No.37 機関投資家モデルを、同一情報時点・同一候補・同一評価基準で比較する。
目的は「最も賢そうな説明」を選ぶことではなく、どの思考モデルがどの市場局面で再現性のある優位性を持つかを実測すること。

## アンチ・後知恵ルール
- 8:00時点の予測は寄り前に predictions/YYYY-MM-DD.json へ固定する。
- 予測ファイルは引け後に書き換えない。訂正が必要な場合は correction を別記し、元予測を残す。
- 3モデルは互いの予測を見ずに独立記録する。
- 欠損データはnull。推定値で埋めない。
- 実際の約定条件が確認できない場合、方向予測と取引成功を混同しない。

## 毎朝の共通出力
各モデルは共通候補3〜5銘柄について以下を残す。
- direction: UP / DOWN / ABSTAIN
- relative: OUTPERFORM / UNDERPERFORM / ABSTAIN
- tradeability: TRADEABLE / WATCH / NO_TRADE
- confidence: low / medium / high
- topPick / avoidPick
- reasonTags
- thesis
- invalidation
- informationCutoff
- evidenceGap

## 引け後の答え合わせ
主要な答えは当日始値→終値。
- |openToClose| < 0.5% はflatとしてdirectionHitRateから除外。
- relativeは銘柄の始値→終値とTOPIX始値→終値の差で判定し、差が±0.5%未満は除外。
- 寄り付きストップ高・売買不能・明らかな流動性欠損はtradeability評価を別に行う。
- previousClose→closeは材料反応の参考指標であり、デイトレ成功率の主指標にはしない。

## 週次比較
毎週月曜に前週を集計する。
- eligibleCalls / hits / directionHitRate
- eligibleRelativeCalls / relativeHits / relativeHitRate
- topPickAverageExcessReturn
- peerContrarianCases / hits / peerContrarianHitRate
- preOpenContrarianCases / hits / preOpenContrarianHitRate
- noTradeCases / noTradeQuality
- reasonTag別 eligible / hits / hitRate
- 4週ローリング値（蓄積後）

比較可能コール5件未満では勝者を断定しない。
単週勝率だけでモデルの優劣を決めず、「どの局面・どの理由タグで強かったか」を主分析とする。

## 市場と違う答えの定義
- peerContrarian: 3モデルのうち1モデルだけ方向判断が異なるケース。
- preOpenContrarian: 検証済みPTS・気配・ギャップ等の寄り前方向と逆の判断をしたケース。
- differentiatedEdge: 上記の逆張りが正解で、かつTOPIX比でも有意な超過収益を出したケース。
これらを週次で集計し、単なる逆張り癖ではなく「独自に正しい答えを持てたか」を測る。
