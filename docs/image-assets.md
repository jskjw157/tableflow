# Tableflow image assets

두 이미지는 built-in `image_gen`으로 직접 생성했다. 종이, 모눈 표, 세이지색 문구와 자연광을 일관된 소재로 사용한다. 이미지 속 글자 대신 실제 HTML로 제목과 안내를 제공한다.

- `public/images/tableflow-paper-flow-1280.jpg` / `-640.jpg`: 상단 표 → 문서 종이 조형 이미지.
- `public/images/tableflow-syntax-notes-960.jpg` / `-480.jpg`: 가이드용 노트, 연필, `| : -` 기호 이미지.

원본 생성 PNG는 생성 도구의 기본 저장소에 보존하고, 브라우저에는 JPEG 품질 86으로 최적화한 로컬 파일을 제공한다. 모바일 `srcset`, 명시적인 비율, 설명 대체 텍스트, 하단 지연 로딩을 적용한다. 다크 모드에서는 밝기만 살짝 낮춘다. 런타임 이미지 생성이나 외부 이미지 요청은 없다.

## Hero prompt

```text
Use case: photorealistic-natural.
Asset type: bespoke editorial hero photograph for Tableflow, a Korean browser-local spreadsheet to Markdown editor. Generate a wide landscape image, approximately 3:2.
Primary request: a beautifully art-directed physical paper sculpture that expresses a spreadsheet becoming flowing lines of a document. Real tactile materials, sophisticated independent design magazine photography.
Scene: warm ivory studio tabletop. Three cream uncoated paper sheets, the left sheet contains a restrained thin graphite spreadsheet grid with a muted forest-sage header row, no readable text. Several narrow strips are cut from the right edge of the sheet and gently curl into orderly parallel ribbons across the scene. A sage-green sheet is partially underneath. One small graphite metal binder clip anchors the left corner. Grid marks have subtle human printed imperfections, soft paper fibers and natural cut edges.
Composition: photographed from an elevated three-quarter viewpoint; coherent single sculpture centered with generous negative space at edges, paper occupies 75 percent of frame, close-up landscape. Beautiful sunlight from upper left produces warm, long soft shadows and subtle paper relief. Quiet, exact, tactile, human-made.
Palette: ivory #f4f0e6, cream, forest sage #3c5934, graphite, restrained olive. Matte natural paper only.
Constraints: convincing real photography; no text, no letters, no numbers, no logos, no watermark, no UI screenshot. No glass, shiny plastic, floating objects, neon, gradient blobs, cartoon mascot, generic 3D SaaS illustration. Do not make an infographic.
```

## Guide prompt

```text
Use case: photorealistic-natural.
Asset type: companion editorial photograph for the Markdown syntax guide of Tableflow, a minimal cream and sage table editing web app. Landscape 3:2.
Primary request: sophisticated independent magazine still-life photography of the analogue tools of tabular writing.
Scene: warm ivory matte tabletop, a small open off-white gridded notebook slightly rotated, a sharpened dark forest-sage wooden pencil resting diagonally on the right page, and three cream square typographic paper slips loosely arranged along the bottom edge of the notebook. Each slip has exactly one large charcoal printed symbol: "|" on the first, ":" on the second, "-" on the third. These are the only characters in the image. Fine thin graphite grid lines in the notebook, no handwriting. A tiny sage paper bookmark sits at the top.
Composition: top down, minimal objects arranged asymmetrically with excellent negative space and editorial balance. Notebook centered, softly cropped natural composition. Real natural paper fibers, worn pencil tip, delicate creases, warm sunlight from upper left and soft realistic long shadows. Restrained human stationery studio atmosphere, tactile and calm.
Palette: warm cream #f4f0e6, desaturated forest sage #3c5934, graphite. Harmonize with a paper spreadsheet sculpture photograph.
Constraints: looks like an actual medium-format photograph with natural imperfections. No readable words, no numbers, no logos, watermark, people, UI, infographic, glossy 3D, neon, gradient blobs. Only the three exact symbols specified, one per slip.
```

