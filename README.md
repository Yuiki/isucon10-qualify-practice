# webapp

各言語の参考実装が用意されています。

```
.
├── fixture     # 問題に使用されるデータ
├── frontend    # フロントエンドのソースコード
├── mysql       # MySQL のテーブルデータ
├── nginx       # Nginx の設定ファイル
└── nodejs      # Node.js の参考実装
```

## 起動方法

```sh
make isuumo/{lang}
```

ベンチマーカーはフロントエンド側へのリクエストを行わないため、以下のコマンドでも計測は可能です。

```sh
make api-server/{lang}
```
