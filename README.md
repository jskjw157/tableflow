# Tableflow

브라우저에서만 동작하는 마크다운 표 ↔ Excel/CSV/TSV/JSON 변환 및 시각적 편집기입니다.

## 실행

Node.js 20.19+ 또는 22.12+ 환경에서:

```sh
npm install
npm run dev
```

개발 주소는 터미널에 표시됩니다(기본 `http://localhost:5173`).

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run preview
```

`dist/`를 정적 웹 호스팅에 배포할 수 있습니다. 별도 서버 API, 데이터베이스, 계정 또는 API 키가 필요하지 않습니다.

## 사용법

- Excel/Google Sheets/Notion의 셀을 복사해 페이지에 붙여넣으면 TSV를 자동 감지합니다.
- CSV, Markdown, JSON 객체 배열 또는 배열의 배열도 입력할 수 있습니다. 모호한 입력은 입력 형식을 직접 지정하세요.
- 표의 셀을 더블클릭하거나 키보드로 선택한 뒤 Enter를 눌러 편집합니다. 선택한 셀의 행/열을 삭제할 수 있습니다.
- 큰 표는 200행씩 표시하며 이전/다음 페이지로 모든 행을 편집할 수 있습니다. 복사·다운로드에는 전체 행이 포함됩니다.
- Markdown/TSV/CSV/JSON 결과를 선택하고 복사하세요. Excel에는 TSV 복사 결과를 붙여넣습니다.
- `.md`, `.csv` 파일 다운로드와 CSV/TSV/MD/TXT/JSON 파일 불러오기를 지원합니다. XLSX 바이너리 파일은 셀 복사 또는 CSV로 저장 후 사용하세요.
- `Ctrl/Cmd+Shift+C`: 현재 결과 복사. 입력창 밖에서 `Ctrl/Cmd+Z`: 실행 취소, `Ctrl/Cmd+Shift+Z` 또는 `Ctrl/Cmd+Y`: 다시 실행.

## 데이터 처리

표 데이터는 React 메모리에만 유지하고 서버 전송, 분석 도구, 외부 폰트, 원격 이미지 또는 외부 API를 사용하지 않습니다. 브라우저 저장소에는 테마 설정만 저장됩니다. 새로고침하면 작업 데이터가 초기화됩니다. 파일·붙여넣기는 2MB까지 지원합니다.

CSV/TSV의 따옴표, 구분자, 셀 내부 줄바꿈을 보존합니다. Markdown의 파이프를 이스케이프하고 줄바꿈은 `<br>`로 출력합니다. 헤더를 끄면 Markdown 문법에 필요한 `열 1`, `열 2` 헤더를 생성하고 원래 첫 행을 데이터로 유지합니다. JSON 값은 그리드 편집을 위해 문자열로 변환합니다. 중복 헤더에는 충돌 없는 접미사를 붙입니다.

페이지가 로드된 뒤에는 인터넷 연결을 끊어도 변환·편집할 수 있습니다. 입력 데이터는 새로고침 전에 복사하거나 다운로드하세요.

## 구현

Vite · React · TypeScript · Tailwind CSS · Lucide React. 변환 함수는 `src/lib/table.ts`, 상태 및 클립보드는 `src/hooks/useTableEditor.ts`, AGY 디자인 화면은 `src/components/Workspace.tsx`와 `src/styles.css`에 있습니다. 디자인 결정과 레퍼런스는 `DESIGN.md`에 기록합니다.

실제 실행한 검증과 범위는 [VERIFICATION.md](VERIFICATION.md)에 기록했습니다.
