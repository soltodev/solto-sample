# Solto Sample Demo

PO장 취합 → Weekly 생성 → PI 발행 흐름을 보여주는 정적 데모입니다.

## 실행

```bash
npm install
npm run dev
```

로컬 URL:

```text
http://127.0.0.1:5173/solto-sample/
```

## 빌드

```bash
npm run build
npm run preview
```

## 데모 범위

- 지원: JS 샘플 PO, JS 양산 PO, 시몬느 PO SHEET의 `.xlsx` 파싱
- 지원: 텍스트 기반 PDF 2종 파싱 (`100010...MKTE`, `ISO26...` DEGRE 계약서)
- 지원: Parsed PO preview, Weekly 행 생성, PI preview, Weekly/PI xlsx 다운로드
- 제외: 스캔본/OCR PDF, Supabase 저장, 원본 Weekly 템플릿 전체 복제

## 배포

`main`에는 소스만 커밋하고, GitHub Pages에는 `dist/` 산출물을 `gh-pages` 브랜치로 푸시합니다.

```bash
npm run build
git worktree add /tmp/solto-sample-gh-pages gh-pages
```

`gh-pages` 브랜치가 아직 없으면 orphan 브랜치를 만든 뒤 `dist/` 내용을 복사해 커밋합니다. SSH 권한은 `~/.ssh/solto` 키를 사용합니다.

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/solto -o IdentitiesOnly=yes' git push origin main
GIT_SSH_COMMAND='ssh -i ~/.ssh/solto -o IdentitiesOnly=yes' git push origin gh-pages
```

배포 URL:

```text
https://soltodev.github.io/solto-sample/
```
