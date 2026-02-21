# AGENT Operational Rules

## 1. Pair Programming Skill (Mandatory)

- 常に `Pair Programming` Skill を優先して使用する。
- コード実装・修正・レビュー・デバッグ・リファクタの全タスクで、まず `Pair Programming` Skill の方針に従う。
- 例外は、ユーザーが明示的に通常モードを指定した場合のみとする。

## 2. docx Directory First-Check (Mandatory)

- すべての作業開始時に、最初に `docx/` ディレクトリの内容を確認する。
- 仕様・要件・設計方針に関連する記述がある場合、それを優先して作業方針に反映する。

## 3. Continuous Documentation Updates

- 実装や仕様変更が発生したら、`docx/` 内の関連ドキュメントへ定期的に追記・修正する。
- 少なくとも以下のタイミングで更新確認を行う。
  - 機能追加後
  - API/データ構造変更後
  - 振る舞い変更後
- ドキュメント未更新のまま変更を完了扱いにしない。

## 4. Documentation Quality

- 変更内容は「何を」「なぜ」「どこを」を簡潔に記録する。
- 実装と記述が矛盾しないよう、最終確認時にコードと突合する。

## 5. Typo Fix Policy

- `AGENTS.md` を含む運用ドキュメント内でタイポや明らかな表記ミスを見つけた場合は、都度修正する。
- タイポ修正は軽微変更として扱い、関連する文脈を壊さない最小差分で更新する。
