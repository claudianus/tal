// 《탈 ― 고양이 탈을 쓰지 않으면 방 밖에 나갈 수 없는 나는》
// 대본 초고 v0.7 — 프롤로그, 1장, 2장, 3장, 막간, 4장, 에필로그
// v0.3: 기획서 0장 '취지'를 반영했다 (0-8의 고칠 곳 목록).
// v0.4: 3장 '들킴'을 썼다.
// v0.5: 막간 '윤서'를 썼다.
// v0.6: 4장 '바닥'을 썼다.
// v0.7: 에필로그(엔딩 A·B·C)를 썼다.
//
// ── 표기 규칙 ──────────────────────────────────────────
// 줄 끝 태그로 그 줄을 어떻게 보여줄지 정한다. 태그가 없으면 윤재의 내레이션이다.
//
//   # voice        자기혐오의 '목소리'. 화면에 흐린 글씨로 겹쳐 뜬다.
//   # fail         행동 실패 문장.
//   # msg          메신저에서 받은 메시지. "이름: 내용" 형식.
//   # msg_me       내가 보낸 메시지.
//   # wall         벽 너머로 들리는 말. 글자가 작고 흐리다.
//   # door         닫힌 문 바로 앞에서 들리는 말.
//   # say          눈앞의 사람이 하는 말. "이름: 내용" 형식.
//   # system       게이지나 상태를 알리는 짧은 안내.
//   # comment      게시판 댓글. "닉네임: 내용" 형식. 닉네임은 전부 ㅇㅇ이다.
//   # caption      게시글 제목, 영상 섬네일 글자, 영상 자막, 검색 결과.
//   # call         통화. 음성 없이 글자로만 뜬다. "이름: 내용" 형식.
//   # draft        입력창에 쓰고 보내지 않은 글.
//
// 혼자 한 줄을 차지하는 태그는 연출 지시다.
//
//   # chapter: …   챕터 제목 카드
//   # scene: …     배경 전환
//   # sfx: …       효과음 (전부 Web Audio 합성)
//   # suit: on / off / head_on / head_off
//   # voice_stop   '목소리'가 멈춘다 / # voice_back  돌아온다
//   # ui: …        메신저 열기·닫기 등
//   # emote: …     wave(손 흔들기) heart(하트) tilt(고개 갸웃) curl(웅크리기) nod(끄덕임)
//   # cut: …       연출 컷
//   # time: …      화면 구석의 시각 표시
//   # pause: n     n초 동안 아무것도 하지 않는다
//   # views: n     화면 구석의 조회수 (3장부터. 한번 뜨면 계속 오른다)
//   # posture: …   윤재의 자세: arm / back / leg (3장 이후 에필로그까지 유지)
//   # pov: …       시점 전환: yunseo / yunjae. 윤서 시점에서는 내레이션이 윤서의 것이고 '목소리'와 기력이 없다.
//
// 선택지 앞의 "(잠김)"은 회색으로 보이지만 고를 수 없는 선택지다.
// 엔진이 막지 못했을 때를 대비해, 고르면 실패 문장이 나오고 제자리로 돌아온다.
// ────────────────────────────────────────────────────

VAR connection = 0      // 연결: 사람과 닿은 만큼 오른다 (엔딩 변수, 플레이어에게 숨김)
VAR strength = 0        // 남은 힘: 기본 행동 성공, 과거 조각, 문 열기 (엔딩 변수, 숨김)
VAR energy = 6          // 기력: 하루에 할 수 있는 행동 수
VAR heat = 0            // 더위: 슈트를 입은 동안 오른다 (0~100)
VAR suit_on = false

VAR frag_1 = false      // 과거 조각 1: 옷장 안쪽의 날짜들
VAR frag_2 = false      // 과거 조각 2: 졸업앨범과 찢어진 공책

VAR eye_shape = "round" // 삼색이의 눈매: round / droopy
VAR talked_toto = false // 프롤로그에서 토토에게 답장했는가
VAR promised_haeun = 0  // 1장에서 하은에게 한 대답: 0 대답 없음, 1 온다, 2 모르겠다
VAR posted_photo = false

// 들킴: 긴장 장면에서 진 값은 그 자리에서 끝나지 않는다. 뒤의 대사가 기억하고, 뒤의 판이 더 어려워진다 (숨김)
VAR caught = 0          // 밤에 들킨 횟수: 다음 순찰·커튼·숨죽이기가 그만큼 빨리 들킨다
VAR wounds = 0          // 댓글에 맞은 횟수: 다음 댓글 판을 그만큼 적은 기력으로 시작한다
VAR father_heard = false // 1장 새벽, 안방 앞에서 발소리가 들어갔다
VAR guard_saw = false   // 3장 밤, 박씨의 손전등이 등에 붙었다
VAR curtain_shot = false // 3장 낮, 커튼 틈이 찍혔다
VAR hush_heard = false  // 4장 새벽, 숨이 샜다

INCLUDE prologue.ink
INCLUDE ch1.ink
INCLUDE ch2.ink
INCLUDE ch3.ink
INCLUDE interlude.ink
INCLUDE ch4.ink
INCLUDE epilogue.ink

-> prologue

=== function spend() ===
~ energy = energy - 1
{ energy < 0:
    ~ energy = 0
}

=== function warm(n) ===
~ heat = heat + n
{ heat > 100:
    ~ heat = 100
}
