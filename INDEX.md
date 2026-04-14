# Solto Sample Demo — 문서 인덱스

> PO장 취합 → Weekly 생성 → PI 발행 데모 서비스 구축을 위한 분석 문서

## 문서 목록

| 문서 | 설명 |
|------|------|
| [01-PROJECT-OVERVIEW.md](./01-PROJECT-OVERVIEW.md) | 프로젝트 목표, 데모 시나리오, 전체 데이터 플로우 |
| [02-PO-DATA-ANALYSIS.md](./02-PO-DATA-ANALYSIS.md) | PO장 3가지 양식 분석 (JS샘플, JS양산, 시몬느), 컬럼 매핑 |
| [03-WEEKLY-STRUCTURE.md](./03-WEEKLY-STRUCTURE.md) | MK Weekly 양식 분석 (68시트, 32컬럼), PO→Weekly 매핑 |
| [04-PI-STRUCTURE.md](./04-PI-STRUCTURE.md) | PI(Proforma Invoice) 양식 분석, Weekly→PI 매핑 |
| [05-DATA-FLOW.md](./05-DATA-FLOW.md) | PO→Weekly→PI 전체 데이터 변환 규칙, 필드 매핑 테이블 |
| [06-IMPLEMENTATION-SPEC.md](./06-IMPLEMENTATION-SPEC.md) | 구현 명세 (페이지, API, DB, 기술스택) |

## 원본 파일

| 파일 | 설명 |
|------|------|
| `PO장/` (30개 파일) | PO 원본 — PDF 18개 + xlsx 12개 |
| `AI-SAMPLE용 (MK Weekly 양식).xlsx` | MK Weekly 실 양식 (68시트, F26~H23 시즌) |
| `PI 형식.xlsx` | PI(견적송장) 양식 템플릿 |

## 관련 프로젝트 참조

| 참조 | 상대 경로 |
|------|-----------|
| Solto AX (매칭엔진) | `../solto-ax/` |
| AX 설계서 | `~/.gstack/projects/ax-outside/viewcommz-main-design-20260329-202837.md` |
| 마스터데이터 | `../솔토_AX_마스터데이터_v1.xlsx` |
| 토큰 사전 | `../solto-ax/supabase/seed.sql` (74 토큰) |
| CLAUDE.md | `../CLAUDE.md` |
