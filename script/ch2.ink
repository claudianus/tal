// 2장 — 무리
// 목표 플레이 시간 25분. 가르치는 것: 맨얼굴 상태의 '시선', 공황, 무감각. 과거 조각 4, 5.
// 이 게임에서 가장 밝은 구간이다. 윤재는 그 밝음을 탈 안에서만 온전히 느낀다.

VAR gaze = 0            // 시선: 맨얼굴로 밖에 있을 때 오른다 (0~100)
VAR frag_4 = false      // 과거 조각 4: 찢어졌다 붙인 등록금 고지서
VAR frag_5 = false      // 과거 조각 5: 전역증
VAR c2_invited = false
VAR said_yes = false    // 토토의 초대에 "갈게요"라고 답했는가
VAR bag_ready = false
VAR has_card = false
VAR showered = false
VAR c2_wash_n = 0
VAR c2_door_n = 0
VAR c2_board_n = 0
VAR saw_pills = false

=== function stare(n) ===
~ gaze = gaze + n
{ gaze > 100:
    ~ gaze = 100
}

=== ch2 ===
# chapter: 2장 — 무리
# scene: playground_night
# pos: swing1
# pose: sit
# npc: haeun swing2
# suit: on
# voice_stop
~ suit_on = true
~ energy = 5
다음 날에도 새벽 세 시에 눈이 떠졌다.
{ promised_haeun:
- 1:
    약속을 했으니까.
- 2:
    약속은 안 했다. 모르겠다고 했다. 그런데 눈이 떠졌다.
- else:
    대답도 없이 돌아섰었다. 그런데 눈이 떠졌다.
}
# emote: wave haeun
그네에 아이가 앉아 있었다. 나를 보고 손을 흔들었다. 높이, 진지하게.
하은: 밀어 줘요. 어제처럼. # say
# pose: stand
# go: by_swing2
* [그네를 민다 # game: push pushed]
- # go: swing_front
# pos: swing1
# pose: sit
그다음 날에도. 그 다음다음 날에도. 아이는 매번 '더요'라고 했고, 나는 매번 조금만 더 밀었다.
돌아올 때마다 107동을 가리켰다. 아이는 매번 '조금만 있다가요'라고 했다.
새벽 세 시가 생겼다. 사 년 동안 내 하루에는 시각이라는 게 없었는데.
-> c2_fish

// ── 몽타주 1: 종이 물고기 ──
=== c2_fish ===
# pause: 1
둘째 날.
하은: 이거요. # say
아이가 주먹을 편다. 색종이로 접은 물고기다. 파란색. 꼬리가 한쪽으로 휘었다.
하은: 고양이는 생선 좋아하잖아요. 진짜는 없어서. # say
* [두 손으로 받는다 # at: wait]
    # emote: heart
    젤리 위에 물고기를 올린다. 날아가지 않게 다른 손으로 덮는다.
    하은: 아껴 먹어요. # say
* [먹는 시늉을 한다 # at: move]
    # emote: eat
    물고기를 주둥이에 가져간다. 냠.
    하은: 안 돼요! 종이예요! 배 아파요! # say
    # emote: laugh haeun
    아이가 소리 없이 웃는다. 어깨가 한참 들썩인다.
- ~ connection++
물고기는 지금 내 책상 위에 있다. 통장 옆에.
-> c2_store

// ── 몽타주 2: 편의점 ──
// 3장 메모: 이 바나나우유는 단지 단톡방에서 "우유 사 주면서 애를 꼬셨다"가 된다.
// 플레이어는 여기서 본 것과 거기서 읽는 것이 같은 일이라는 걸 안다.
=== c2_store ===
# pause: 1
닷새째.
식탁 위의 만 원을 집었다. 고양이도 돈이 필요할 때가 있다.
# scene: convenience_store
# pos: in
# npc: clerk clerk
# sfx: door_chime
~ heat = 30
단지 상가의 편의점. 형광등이 이렇게 밝은 곳에 들어온 건 사 년 만이다.
계산대 뒤에 알바가 있다. 휴대폰을 보다가 고개를 든다.
나를 본다. 이 초.
다시 휴대폰을 본다.
알바: 어서 오세요. # say
그게 전부다.
새벽 세 시에 두 발로 걷는 삼색 고양이가 들어왔는데, 그게 전부다. 이 사람은 이 시간에 더한 것도 봤을 것이다.
* [음료 냉장고 # at: milk]
- 냉장고 문을 젤리로 밀어서 연다. 바나나우유 두 개. 하나는 아이 거, 하나는 내 거. 내 건 마실 수 없다는 걸 알면서 두 개를 집는다.
* [계산대 # at: counter]
- 바나나우유 두 개를 계산대에 올린다.
알바: 삼천사백 원이요. # say
* [지폐를 꺼낸다 # game: bill done]
- 고양이 손으로 지폐 한 장을 집는 데 한참 걸린다. 알바는 재촉하지 않는다. 휴대폰도 보지 않는다. 그냥 기다린다.
알바: 봉투 필요하세요? # say
* [고개를 젓는다 # at: right]
    # emote: shake
- 거스름돈이 문제다. 동전은 젤리로 집을 수 없다.
* [동전을 집는다 # game: coins done]
- 알바가 그걸 삼 초쯤 지켜보더니, 동전을 내 손바닥 위에 하나씩 올려 준다. 굴러떨어지지 않게, 가운데부터.
알바: …젤리 잘 만드셨네요. # say
알바: 안녕히 가세요. # say
* [나간다 # at: z_out]
- # sfx: door_chime
아무것도 묻지 않았다. 아무 표정도 없었다.
무관심이 이렇게 따뜻할 수도 있다는 걸 몰랐다.
# scene: playground_night
# pos: swing1
# pose: sit
# npc: haeun swing2
하은: 고양이도 편의점 가요? # say
하은: 빨대는 내가 꽂을게요. 아저씨 손으로는 안 되잖아요. # say
아이가 두 개 다 꽂아서 하나를 내민다. 그러다 멈춘다.
하은: …아저씨는 어떻게 마셔요? 입이 안 열리는데. # say
* [고개를 갸웃한다 # at: left]
    # emote: tilt
* [하은 쪽으로 밀어 준다 # at: up]
    # emote: give
    우유를 아이 쪽으로 민다.
- 하은: 그럼 아저씨 거는 내가 대신 마셔 줄게요. # say
하은: 맛은 내가 알려 줄게요. 달아요. # say
~ connection++
-> c2_rain

// ── 몽타주 3: 소나기 ──
=== c2_rain ===
# pause: 1
8월의 끝.
# scene: under_slide
# pos: swing1
# pose: stand
# npc: haeun swing2
# sfx: rain_sudden
소나기다. 예고도 없이 쏟아진다.
인조 모피는 젖으면 안 된다.
# npc: haeun floor_slide walk
* [미끄럼틀 밑으로 뛴다 # at: z_slide]
- # go: slide_under
# pose: curl
아이가 먼저 와 있다.
둘이 쪼그려 앉는다. 철판 위로 비가 떨어진다.
# sfx: rain_on_metal
미끄럼틀 끝으로 빗물이 들이친다. 아이 쪽이다. 잠옷 어깨가 벌써 젖었다.
# pose: stand
* [아이 바깥쪽으로 옮겨 앉는다 # at: z_rainside]
- # go: rainside
# pose: curl
등으로 빗줄기를 받는다. 인조 모피가 무거워진다. 젖으면 안 된다는 건 아까 일이다.
하은: 집에 가기 싫어요. # say
# pause: 2
하은: 엄마는 아침에 와요. 아침에 오면 피곤해요. # say
하은: 피곤하면… 내가 조용히 해야 돼요. # say
하은: 근데 나는 조용히를 잘 못해요. # say
나는 조용히를 잘한다. 사 년을 했다. 그 전에도 했다.
가르쳐 줄 수 있다.
가르쳐 주면 안 되는 거라는 것도 안다.
아이가 내 팔에 머리를 기댄다.
하은: 삼색이 아저씨는 푹신해요. # say
아이 숨이 빠르다. 내 숨도 빠르다. 탈 안에서는 내 숨이 제일 크게 들린다.
* [숨을 천천히 쉰다 # game: breath calm]
- 내 숨이 느려지자 기대 온 숨도 따라 느려진다. 잠들었다.
~ heat = 80
덥다. 비 때문에 습기가 탈 안에 찬다.
-> c2_rain_choice

=== c2_rain_choice ===
* [가만히 있는다 # at: up]
    -> c2_rain_still
* [살짝 깨운다 # at: left]
    -> c2_rain_wake
+ [(잠김) 누군가에게 알린다 # at: right]
    누구에게. # fail
    탈을 쓴 채로는 말을 못 한다. 벗은 채로는 방 밖에 못 나온다. # fail
    -> c2_rain_choice

// 가만히 있기로 했다: 버틴다. 버티지 못하고 움직이면 아이가 깬다.
=== c2_rain_still ===
* [버틴다 # game: still still]
    -> c2_rain_held
* [움직였다 # game: still wake]
    팔이 저절로 움찔한다. 아이 머리가 미끄러진다.
    -> c2_rain_woke

=== c2_rain_wake ===
-> c2_rain_woke

=== c2_rain_held ===
    ~ heat = 100
    ~ connection++
    십 분. 이십 분.
    눈구멍 가장자리가 하얗게 뜬다. 한계는 아까 지났다.
    그래도 팔은 움직이지 않는다.
    누가 나한테 기대어 잠든 건 처음이다. 윤서 이후로는.
    비가 가늘어질 때쯤 아이가 눈을 뜬다.
    하은: …잤어요? 나 잤어요? # say
    하은: 아저씨 팔 저렸겠다. # say
    -> c2_rain_end

=== c2_rain_woke ===
    젤리로 아이 어깨를 두드린다. 두 번.
    하은: …아. 미안해요. # say
    아이는 금방 사과한다. 사과가 몸에 밴 아이다.
    그 속도를 안다.
    -> c2_rain_end

=== c2_rain_end ===
# scene: playground_night
# pos: slide_under
# pose: stand
# npc: haeun floor_slide
비가 그친다.
# npc: haeun edge walk
아이는 107동으로 뛰어가다가 한 번 돌아보고 손을 흔든다.
# emote: wave haeun
# emote: wave
# npc: haeun off
나는 한참 뒤에야 손을 내린다.
-> c2_day

// ── 낮의 방 (허브) ──
=== c2_day ===
# scene: room_day_rain
# suit: off
# voice_back
# time: 수요일
~ suit_on = false
~ heat = 0
낮의 나는 여전히 여기 있다.
벽지 모서리에 곰팡이가 번진다. 장마는 끝났는데 소나기가 매일 온다.
밤에 애랑 그네 좀 탄다고 뭐가 달라지냐. # voice
달라진 건 없다. 책상 위에 종이 물고기가 한 마리 생겼을 뿐이다.
# ui: energy_show
-> c2_room

=== c2_room ===
# pose: stand
{ energy <= 0:
    기력이 없다. # system
}
* {not c2_invited} [모니터를 본다 # at: monitor]
    -> c2_invite
* {c2_invited and energy > 0 and not bag_ready} [삼색이를 넣을 가방을 찾는다 # at: closet]
    -> c2_bag
* {c2_invited and energy > 0} [교통카드를 찾는다 # at: head]
    -> c2_drawer
+ {c2_invited and energy > 0 and not showered} [씻는다 # at: door]
    -> c2_wash
+ {not (bag_ready and showered)} [눕는다 # at: bed]
    -> c2_lie
* {bag_ready and showered} [토요일. 나간다 # at: door]
    -> c2_saturday

=== c2_lie ===
# go: bed
# pose: lie
# pause: 2
~ energy = 5
누웠다.
{수요일이 목요일이 됐다.|목요일이 금요일이 됐다.|눈을 떴다. 달력을 본다. 아직 토요일은 아니다. 날짜를 확인하는 버릇이 생겼다.}
-> c2_room

// ── 초대 ──
=== c2_invite ===
# ui: messenger_open
~ c2_invited = true
토토: 삼색이님 # msg
토토: 이번 주 토요일에 서울에서 소모임 하는데 # msg
토토: 홍대 파티룸 빌림. 여섯 명 정원인데 한 자리 남음 # msg
토토: 슈트 가져와도 되고 몸만 와도 됨 # msg
토토: 부담 주는 거 아님!! 진짜 아님!! 근데 오면 내가 피자 삼 # msg
서울.
지하철을 타야 한다. 지하철에는 사람이 있다.
삼색이는 가방에 넣고, 나는 맨얼굴로 타야 한다.
입력창에 쓴다. '죄송한데 저는 못 갈 것'.
가서 뭐 하게. 얼굴 보면 다 도망가. # voice
* {energy > 0} [지우고 다시 쓴다: "갈게요." # at: up]
    ~ spend()
    ~ said_yes = true
    ~ connection++
    * * [자판을 누른다: "갈게요." # game: type sent]
    - - 삼색이: 갈게요. # msg_me
    엔터를 누른 건 내 손가락이다. 나는 아직 아무것도 정하지 않았다.
    토토: !!!!!!!! # msg
    토토: 피자 두 판 삼 # msg
    토토: 토요일 두 시. 주소 찍어 둠. 길 모르면 역으로 데리러 감 # msg
* {energy > 0} [지우고 다시 쓴다: "생각해 볼게요." # at: left]
    ~ spend()
    * * [자판을 누른다: "생각해 볼게요." # game: type sent]
    - - 삼색이: 생각해 볼게요. # msg_me
    토토: ㅇㅋㅇㅋ # msg
    토토: 토요일 두 시. 주소 찍어 둠. 당일에 말해도 됨. 당일에 말 안 하고 와도 됨 # msg
* [그대로 둔다 # at: down]
    쓰다 만 문장이 입력창에 남는다. 보내지도, 지우지도 않았다.
    한 시간 뒤에 메시지가 하나 더 온다.
    토토: 주소 찍어 둠. 토요일 두 시. 자리는 비워 둘게요 # msg
- # ui: messenger_close
토요일까지 사흘이다.
가려면 세 가지가 필요하다. 가방. 교통카드. 그리고 씻은 몸.
세 번째가 제일 멀다.
-> c2_room

// ── 가방과 과거 조각 5: 전역증 ──
=== c2_bag ===
~ spend()
~ bag_ready = true
옷장 맨 아래에 가방이 하나 있다.
국방색 의류대. 전역하던 날 메고 나온 가방이다. 그날 이후로 지퍼를 연 적이 없다.
삼색이의 머리를 넣어 본다. 딱 맞는다.
군대가 내게 준 것 중에 처음으로 쓸모 있는 것이다.
옆 주머니에 뭔가 딱딱한 게 만져진다.
* [옆 주머니를 연다 # at: up]
    -> c2_discharge
* [열지 않는다 # at: down]
    뭔지 안다. 그래서 열지 않는다.
    -> c2_room

=== c2_discharge ===
# cut: discharge_card
전역증.
스물두 살의 내가 증명사진 속에 있다. 머리가 짧다. 눈이 지금보다는 앞을 본다.
병장 남윤재. 만기 전역.
만기.
그 두 글자를 받으려고 일 년 반을 버텼다.
일병 때 선임 하나가 나를 골랐다. 이유는 없었다. 고르는 쪽에는 이유가 필요 없다.
밤마다 불려 나갔다. 잠을 안 재우는 게 제일 쉽고 흔적이 안 남는 방법이었다.
넉 달째에 사격장에서 숨이 안 쉬어졌다. 엎드린 채로, 총을 쥔 채로.
의무대에서는 공황이라고 했다. 중대에서는 관심병사라고 했다. 선임들은 '관심이'라고 불렀다.
그래도 끝까지 했다. 도망치지 않았다.
만기 전역. 내가 끝까지 한 몇 안 되는 일이다.
* [전역증을 오래 본다 # at: wait]
- # pause: 1
전역하고 일주일 뒤에 아버지에게 말했다. 한 번은 말해 보고 싶었다.
아버지는 TV에서 눈을 떼지 않았다.
'군대 가서 그것도 못 버티냐. 남들 다 하는 걸.'
버텼는데요.
그 말은 하지 못했다.
그러게. 남들 다 하는 걸. # voice
그 무렵부터다. 죽고 싶다는 생각이 날씨 같은 게 된 건.
맑은 날은 없다. 흐리거나, 비가 오거나.
~ frag_5 = true
~ strength++
전역증을 주머니에 도로 넣는다. 지퍼를 잠근다.
-> c2_room

// ── 교통카드와 과거 조각 4: 등록금 고지서 ──
=== c2_drawer ===
~ spend()
~ has_card = true
책상 서랍 맨 아래. 지갑이 있다. 사 년 전의 지갑이다.
교통카드. 잔액은 모른다. 학생증. 사진 속의 나는 스무 살이다.
그리고 여러 번 접힌 종이 한 장.
* [종이를 편다 # at: up]
    -> c2_tuition
* [지갑만 챙긴다 # at: left]
    카드만 뺀다. 종이는 접힌 채로 둔다.
    -> c2_room

=== c2_tuition ===
# cut: tuition_bill
등록금 고지서.
가운데가 세로로 찢어졌다가 테이프로 붙어 있다. 스무 살 2월의 것이다.
그 일 년 전 겨울에 아버지가 차를 몰고 내려왔었다. 내가 이 년 동안 살던 집으로.
'남들이 뭐라는 줄 아냐. 애를 시골에 갖다 버렸다더라.'
나를 데리러 온 게 아니었다. 남들 말을 데리러 온 거였다.
마루에서 가방을 쌌다. 고양이가 가방 위에 올라앉아 비키지 않아서, 한참을 싸지 못했다.
그분은 대문 앞에 서 계셨다. 차가 골목을 다 돌 때까지.
# pause: 1
옛 테이프가 누렇게 말라 들떴다. 두 쪽이 따로 논다.
* [찢어진 자리를 맞춰 본다 # game: tape matched]
- 글자 줄이 이어진다. 찢어진 자리는 맞춰도 보인다.
돌아와서 일 년을 더 공부했다. 붙은 곳은, 이름을 말하면 사람들이 '아…' 하는 대학이었다.
아버지가 고지서를 찢었다.
'이 돈 내고 거길 가느니.'
테이프는 내가 붙였다.
학자금 대출 서류에는 보호자 서명 칸이 있었다. 엄마가 서명했다. 아무 말 없이.
그러고는 말했다.
'아빠한테는 네가 알아서 했다고 해.'
# pause: 1
그 집에서 나는 숨을 쉬었다. 여기서는 참는다.
그 차이를 알아 버린 채로 돌아온 거다.
~ frag_4 = true
~ strength++
종이를 접는다. 접힌 자국대로 접힌다.
-> c2_room

// ── 씻기: 세 번째에 성공한다 ──
=== c2_wash ===
~ spend()
~ c2_wash_n++
{ c2_wash_n:
- 1:
    방문을 열었다. 열일곱 걸음.
    화장실 문 앞까지 갔다. 안방에서 기침 소리가 났다. # fail
    돌아왔다. # fail
    -> c2_room
- 2:
    화장실에 들어갔다. 물을 틀었다.
    물이 데워지기를 기다리다가, 뭘 기다리는지 잊었다. # fail
    정신이 드니 방이었다. 물은 잠갔나. 잠갔다. 아마. # fail
    그런 꼴로 사람을 만나러 가겠다고. # voice
    -> c2_room
- else:
    ~ showered = true
    ~ strength++
    # sfx: shower
    씻었다.
    머리를 두 번 감았다. 처음 것은 거품이 나지 않았다.
    거울에 김이 서려 있어서 다행이었다.
    수건에서 엄마가 쓰는 세제 냄새가 난다.
    이 집에도 좋은 냄새가 나는 물건이 있었다.
    -> c2_room
}

// ── 토요일: 맨얼굴로 나간다 ──
=== c2_saturday ===
# scene: room_day
# time: 토요일 13:20
# ui: energy_hide
토요일. 한 시 이십 분. 비가 그쳤다.
안방에서 코 고는 소리가 난다. 아버지는 밤에 남의 차를 몰고 낮에 잔다. 엄마는 식당에 있다.
의류대를 멘다. 사 킬로그램쯤. 등에 고양이를 업었다.
# carry: bag
{ not said_yes:
    토토에게는 아직 간다고 하지 않았다. 말하면 가야 하니까.
    가면서 말하면 된다. 못 가면, 안 말한 게 된다.
}
# scene: livingroom_day
# pos: from_room
-> c2_frontdoor

=== c2_frontdoor ===
+ [현관문을 연다 # at: frontdoor]
    ~ c2_door_n++
    { c2_door_n:
    - 1:
        신발을 신었다. 사 년 전의 운동화다. 헐겁다. 발이 준 게 아니라 내가 준 거다.
        문고리에 손이 올라가지 않는다. # fail
        나가면 본다. 다 본다. # voice
        -> c2_frontdoor
    - 2:
        # sfx: door_open
        # room: front_open
        열었다.
        복도의 빛이 들어왔다. 낮의 빛이다. # fail
        닫았다. # fail # room: door_shut
        -> c2_frontdoor
    - else:
        # room: front_open
        등의 무게를 생각한다.
        삼색이는 열한 층을 걸어서 내려갔다. 그 다리가 이 다리다.
        -> c2_corridor
    }

=== c2_corridor ===
# scene: corridor_day
# sfx: doorlock_beep_open
# ui: gaze_show
~ gaze = 10
열렸다.
낮의 복도는 밤의 복도와 다른 곳이다. 전부 보인다.
나도 전부 보인다.
# sfx: door_open
# room: door_1107
# npc: neighbor at_1107
1107호 문이 열린다. 쓰레기봉투를 든 아주머니가 나온다.
~ stare(25)
아주머니: 어머. # say
아주머니: …그 집 아들 맞지? 아이고, 이게 얼마 만이야. 얼굴이 왜 이렇게… # say
말끝이 흐려진다. 흐려진 자리에 눈이 박힌다. 덮인 이마에, 늘어난 목에, 등의 군용 가방에.
-> c2_neighbor

=== c2_neighbor ===
* [고개를 숙이고 지나간다 # at: z_1107]
    # pose: stoop
    # go: past_1107
+ [(잠김) "안녕하세요"라고 한다 # at: wait]
    혀가 입천장에 붙었다. # fail
    이십 년을 옆집에 산 사람에게 할 인사가 없다. # fail
    -> c2_neighbor
- 바닥을 보고 걷는다. 복도 타일의 금을 센다.
등 뒤에서 작은 소리가 따라온다.
아주머니: …나오긴 나오는구나. # wall
~ stare(10)
# pose: stand
# go: lift
엘리베이터를 탄다. 사 킬로그램을 메고 열한 층은 못 내려간다.
거울을 등지고 선다. 7층에서 유모차가 탄다. 아기가 나를 본다. 아기는 괜찮다. 아기 엄마가 문제다.
~ stare(10)
1층.
# scene: street_day
해가 정수리에 닿는다. 사 년 만이다.
아프다. 빛도 오래 안 맞으면 아프다는 걸 처음 알았다.
역까지 십이 분.
* [역으로 걷는다 # at: z_station]
-
{ not has_card:
    -> c2_gate
}
-> c2_subway

=== c2_gate ===
# scene: station_gate
# pos: in
교통카드가 없다.
* [발매기 앞에 선다 # at: machine]
- 화면의 글자가 읽히지 않는다. 한글인데 읽히지 않는다.
# npc: pb q1
# npc: pe q2
# npc: pf q3
뒤에 줄이 생긴다.
~ stare(15)
누가 혀를 찬다. 나한테 찬 건지는 모른다. 나한테 찬 거다.
보증금 오백 원. 일회용 카드가 나온다. 손이 젖어 있다.
* [개찰구를 지난다 # at: z_gate]
- -> c2_subway

// ── 지하철 ──
=== c2_subway ===
# scene: subway
# pos: in
# npc: pa seat_a
# npc: pb seat_b
# npc: pc seat_c
# npc: pd seat_d
# npc: pe seat_e
# npc: pf seat_f
# npc: pg seat_g
# npc: ph seat_h
# npc: pi seat_j
# npc: pj stand_b
# sfx: subway_rumble
1호선. 토요일 낮. 서 있는 사람이 드문드문 있다.
* [문 옆 구석에 선다 # at: z_corner]
    ~ stare(5)
    문과 좌석 사이의 좁은 틈에 등을 붙인다. 가방은 앞으로 돌려 안는다.
    벽이 하나라도 있으면 눈이 올 방향이 하나 준다.
    # npc: kid kid_c
    # npc: mom mom_c
* [빈자리에 앉는다 # at: z_seat]
    # pose: sit
    ~ stare(20)
    앉았다. 다리가 먼저 원했다.
    맞은편에 일곱 명이 앉아 있다. 일곱 명에게는 눈이 열네 개 있다.
    전부 휴대폰을 보고 있다. 안다. 아는데도 열네 개가 느껴진다.
    # npc: kid kid_s
    # npc: mom mom_s
- 세 정거장.
옆에 선 아이가 내 가방을 본다.
지퍼 끝으로 주황색 털이 삐져나와 있다.
# emote: point kid
아이: 엄마, 저 아저씨 가방에 고양이 있어. # say
엄마: 쉿. # say
아이 엄마가 나를 본다. 가방을 본다. 그러고는 아이 어깨를 잡아 반대편으로 당긴다.
# npc: mom far2 walk
# npc: kid far walk
~ stare(25)
봤지. 저 눈. # voice
애를 당기는 거 봤지. # voice
* [털을 밀어 넣는다 # game: zip zipped]
    # emote: reach
    지퍼가 끝까지 올라갔다. 끝까지 올렸는데도 손가락이 손잡이를 놓지 못한다.
* [털을 밀어 넣는다 # game: zip fumbled]
    지퍼가 세 번 헛돈다. 결국 가방을 끌어안는다. 턱으로 지퍼 끝을 누른다. 안에서 폼이 눌린다.
- 안내 방송이 나온다.
# sfx: subway_announce
이번 역은 신도림. 2호선으로 갈아타실 분은 이번 역에서.
갈아타야 한다.
* [내릴 문 앞으로 간다 # at: z_doorway]
- 문 앞에 선다. 어두운 유리에 고양이 귀가 비친다. 그 뒤로 사람들이 일어선다.
-> c2_panic

=== c2_panic ===
# scene: transfer_crowd
# pos: arrive
# crowd: on
# sfx: crowd_loud
~ gaze = 100
문이 열린다.
사람들이 쏟아진다. 나는 그 안에 있다.
환승 통로. 어깨. 가방. 어깨. 구두 굽 소리. 안내 방송. 누가 웃는다.
웃는다.
나를 보고 웃는 건가.
아니다.
아닌가.
# ui: panic
숨이
숨이 안
{ frag_5:
    사격장 바닥의 흙냄새가 난다. 여기는 지하인데.
}
벽을 찾는다. 벽이 없다. 사람이 벽이다.
* [계단까지 간다 # game: crowd made]
    계단 난간에 손이 닿았다. 손바닥이 미끄럽다. 난간을 잡은 채로 내려간다.
* [떠밀린다 # game: crowd pushed]
    몸이 먼저 움직인다. 인파가 미는 대로 밀려 내려간다.
- # crowd: off
# scene: platform_bench
# pos: bench
# pose: sit
# npc: pc wait_a
# npc: pg wait_b
# sfx: ringing_ear
벤치.
무릎 사이에 머리를 넣는다. 의류대를 끌어안는다.
가방 안에서 삼색이의 얼굴이 내 가슴에 닿아 있다.
거 봐. # voice
환승 한 번을 못 해. # voice
스물여섯이. # voice
토토가 네 얼굴 보면 뭐라고 할 것 같아. # voice
-> c2_board

=== c2_board ===
+ [열차를 탄다 # at: move]
    ~ c2_board_n++
    { c2_board_n:
    - 1:
        # sfx: train_arrive
        # train: arrive
        # train: open
        # pause: 1.5
        열차가 왔다. 문이 열렸다. 사람들이 탔다. 문이 닫혔다. # fail
        # train: close
        # train: leave
        나는 벤치에 있다. # fail
        -> c2_board
    - 2:
        # sfx: train_arrive
        # train: arrive
        두 번째 열차.
        # pose: stand
        # go: line
        # train: open
        일어섰다. 노란 선까지 갔다. 문 안에 얼굴들이 있었다. # fail
        # train: close
        # train: leave
        # go: bench
        # pose: sit
        돌아와 앉았다. # fail
        -> c2_phone
    - else:
        -> c2_boarded
    }
+ [(잠김) 집으로 돌아간다 # at: wait]
    돌아가려면 반대편 승강장으로 건너가야 한다. 계단을 올라야 한다. 계단에는 사람이 있다. # fail
    돌아가는 것도 못 한다. # fail
    -> c2_board

=== c2_phone ===
# sfx: phone_buzz
# ui: phone_open
주머니에서 휴대폰이 떤다.
{ said_yes:
    토토: 어디쯤이에요? # msg
- else:
    토토: 혹시 오고 있음? 아니면 말고!! # msg
}
토토: 천천히 와요. 우리 어차피 피자 기다리는 중 # msg
토토: 안 와도 됨 # msg
토토: 근데 오면 좋겠음 # msg
오면 좋겠음.
내가 오면 좋겠다는 사람이 서울에 한 명 있다.
그 사람은 여우고, 내 얼굴을 모른다.
* [답장한다: "신도림이에요. 가고 있어요." # at: up]
    ~ connection++
    * * [자판을 누른다: "신도림이에요. 가고 있어요." # game: type sent]
    - - 삼색이: 신도림이에요. 가고 있어요. # msg_me
    가고 있다고 썼다. 벤치에 앉아서.
    썼으니까 이제 그게 맞아야 한다.
* [답장하지 않고 일어선다 # at: down]
    화면을 끈다. 답은 가서 한다.
- # ui: messenger_close
-> c2_board

=== c2_boarded ===
# sfx: train_arrive
# train: arrive
~ gaze = 60
~ strength++
세 번째 열차.
# pose: stand
# go: line
# train: open
탔다.
# pose: gone
# train: close
문이 닫힌다. 문 유리에 군용 가방을 끌어안은 남자가 비친다.
# train: leave
그 남자는 열차 안에 있다.
# scene: subway
# pos: corner
# face: left
# npc: pa seat_a
# npc: pc seat_c
# npc: pe seat_e
# npc: pg seat_g
# npc: pi seat_i
여덟 정거장. 숨을 센다. 넷을 들이쉬고, 넷을 멈추고, 넷을 내쉰다. 의무대에서 배운 것이다.
* [숨을 센다 # game: breath calm]
- 이번 역은 홍대입구.
-> c2_partydoor

// ── 파티룸 ──
=== c2_partydoor ===
# scene: partyroom_door
# time: 14:47
# npc: moka seat_moka
# npc: gombyo seat_gom
# npc: silbap seat_sil
골목 안쪽 건물 삼 층. 문에 종이가 붙어 있다. '털날림 주의보 정모'. 옆에 발바닥 도장.
문 너머에서 웃음소리가 난다.
* [문 앞에 선다 # at: frontdoor]
- 문 앞이다. 손만 들면 된다.
* [노크한다 # game: knock knocked]
    똑. 똑. 똑. 소리가 너무 작다. 웃음소리에 묻힌다.
    그래도 쳤다. 세 번.
    # sfx: door_open
    문이 안에서 열린다.
* [노크한다 # game: knock opened]
    손을 들었다. # fail
    내렸다. # fail
    사 분을 서 있었다.
    # sfx: door_open
    두드리기도 전에 문이 안에서 열린다.
-
# npc: hyunwoo hw_out
정장 바지에 흰 셔츠를 입은 남자가 지갑을 들고 나오다가 나와 부딪칠 뻔한다. 넥타이는 풀어서 주머니에 꽂았다. 사원증 줄이 삐져나와 있다.
현우: 어. # say
~ stare(15)
내 또래다. 머리를 단정하게 넘겼다. 구두를 신었다.
지하철에서 마주쳤다면 내가 제일 먼저 눈을 피했을 종류의 사람이다.
남자의 눈이 내 얼굴에서 가방으로 내려간다. 지퍼 끝으로. 주황색 털로.
현우: …삼색이네. # say
현우: 삼색이님? # say
-> c2_meet

=== c2_meet ===
* [끄덕인다 # at: up]
    # emote: nod
* ["…삼색이예요." # at: left]
    …삼색이예요.
    목소리가 갈라졌다. 그래도 나왔다.
+ [(잠김) "남윤재입니다"라고 한다 # at: right]
    그 이름은 여기까지 가져오지 않았다. # fail
    -> c2_meet
- 현우: 와. 진짜 왔네. 진짜 왔어. # say
현우: 아 나 지금 좀 감동임. 피자 배달인 줄 알고 나왔는데 삼색이님이 서 있어. # say
* [바닥을 본다 # at: move]
    # face: down
* [고개를 꾸벅한다 # at: wait]
    # emote: nod
- 현우: 토토예요. 본명은 기현우인데, 그건 회사에서나 쓰는 거고. # say
이 사람이 토토다.
여우가 아니다. 그런데 말투는 메시지 그대로다.
토토는 내 얼굴을 삼 초 보고, 더 보지 않았다. 눈을 덮은 머리도, 늘어난 목도 묻지 않았다.
그 대신 가방 쪽으로 손을 내밀었다.
* [끈을 놓는다 # game: bag given]
    # carry: off
    마지막 손가락이 떨어진다. 가방이 내 손을 떠나 남의 손으로 간다.
    현우: 무겁죠 이거. 헤드가 제일 무거워요. 들어와요. # say
* [끈을 놓는다 # game: bag kept]
    손가락이 펴지지 않는다.
    현우: 아, 들고 올래요? 그래요, 그게 편하지. # say
    토토가 손을 거두고 문을 잡아 준다. 안에 들어가서야 바닥에 내려놓는다.
    # carry: off
-
~ gaze = 40
-> c2_room_party

=== c2_room_party ===
# scene: partyroom
# pos: inside
# npc: hyunwoo hw_in
# npc: moka seat_moka
# npc: gombyo seat_gom
# npc: silbap seat_sil
꼬마전구. 소파. 접이식 테이블. 에어컨이 세게 돈다.
세 사람이 있다.
모카: 삼색이님이다!! 사진 봤어요, 사진!! # say
스무 살쯤. 머리띠에 강아지 귀를 달고, 허리에 꼬리를 찼다. 그것만 달았는데도 강아지 같다.
곰표: 어서 와요. 이쪽 앉아요, 에어컨 바람 오는 자리. # say
* [에어컨 바람 오는 자리로 간다 # at: table]
- # go: my_seat
# pose: sit
# npc: hyunwoo seat_hw walk
사십 대. 등산복 조끼. 구청 민원실에 앉아 있을 것 같은 얼굴인데, 실제로 구청에 다닌다고 한다. 불곰 풀슈트 십이 년 차.
실밥: …그 털 어디 거예요? 결이 좋은데. # say
서른 남짓. 인사보다 가방 지퍼를 먼저 본 사람. 손가락에 골무 자국이 있다.
눈이 여섯 개다.
그런데 박히지 않는다.
이 눈들은 나를 지나서 가방을 본다. 삼색이를 본다.
~ gaze = 20
# pause: 1
피자가 온다. 받는다. 먹는다.
맛있는 음식이라는 건 안다.
모카가 뭔가를 말하고 다들 웃는다. 나도 입꼬리를 올린다.
올라갔는지는 모르겠다. 반 박자 늦었다는 것만 안다.
여기는 따뜻한 곳이다. 그건 알겠다.
유리창 너머로 난로를 보는 것처럼 안다.
넌 여기서도 혼자네. # voice
곰표: 그런데 삼색이님은 무슨 일 해요? # say
~ stare(30)
# pause: 2
-> c2_job

=== c2_job ===
* [피자를 본다 # at: table]
+ [(잠김) "쉬고 있어요"라고 한다 # at: up]
    쉰다는 건 일하던 사람이 하는 말이다. # fail
    -> c2_job
+ [(잠김) 사실대로 말한다 # at: left]
    사 년. 방. 그 단어들은 이 방의 전구 밑에 꺼내 놓을 수 없다. # fail
    -> c2_job
- 피자 위의 올리브가 여섯 개다.
현우: 아, 곰표님. 그거 금지 질문. # say
현우: 여기서는 종만 물어보는 거예요. 무슨 종이에요, 까지만. # say
곰표: 아이고, 미안해요. 직업병이야. 민원인한테 하루 종일 묻는 게 그거라서. # say
모카: 저는 무슨 일 하냐고 물으면 강아지라고 해요. # say
다들 웃는다.
토토는 내 쪽을 보지 않고 콜라를 따라 준다. 구해 준 티를 내지 않는다. 잔이 식탁 위로 밀려온다.
* [잔을 두 손으로 받는다 # at: table]
    # emote: reach
    차갑다. 두 손으로 쥐고 있으면 손이 할 일이 생긴다.
* [토토 쪽으로 끄덕인다 # at: wait]
    # emote: nod
- ~ gaze = 15
~ connection++
현우: 대신 이런 건 물어도 돼요. 곰표님은 왜 곰이에요? # say
곰표: 그 얘기를 또 해? # say
모카: 저 이거 네 번째 들어요. 근데 들을 때마다 좋아요. # say
곰표: 스무 살 때 놀이공원에서 인형탈 알바를 했어요. 여름에. 죽는 줄 알았지. # say
곰표: 근데 탈을 쓰고 서 있으면 애들이 뛰어와서 다리에 매달려요. 내가 누군지도 모르면서. # say
곰표: 탈을 벗으면 아무도 안 매달리거든. 그래서 알바는 끝났는데 탈을 못 끊었어요. 그게 이십 년 넘었네. # say
* [끄덕인다 # at: wait]
    # emote: nod
    새벽 그네가 생각난다. 그 애도 내 얼굴은 모른다.
- 현우: 모카님은요? # say
모카: 저요? 이유요? 없는데요. # say
모카: 어릴 때 강아지 나오는 만화 좋아했고, 지금도 좋아해요. 끝. # say
모카: 등산 좋아하는 사람한테는 왜 좋아하냐고 안 묻잖아요. # say
곰표: 묻던데. 나는 물어요. # say
모카: 그건 직업병이고요. # say
이유가 없어도 되는 거였다.
나는 내 이유를 열두 개쯤 댈 수 있다. 그게 자랑이 아니라는 건 방금 알았다.
토토는 내게는 묻지 않는다.
-> c2_silbap

=== c2_silbap ===
실밥: 봐도 돼요? # say
* [가방을 연다 # at: table]
- 삼색이를 꺼낸다. 머리부터.
와, 하는 소리가 세 군데서 난다.
실밥이 두 손으로 받는다. 돌려 본다. 뒤집어 본다. 안쪽을 들여다본다.
실밥: 첫 작품이라고요? 거짓말. # say
실밥: 이 박음질 간격 봐요. 손으로 한 거예요? 전부? # say
실밥: 귀는 일부러 처지게 한 거예요? # say
* [끄덕인다 # at: up]
    # emote: nod
* [고개를 젓는다 # at: right]
    # emote: shake
- 실밥: 일부러든 아니든 이게 맞아요. 세우지 마요. 절대. # say
실밥: 나는 인형 옷 만들다가 왔어요. 손바닥만 한 거. # say
실밥: 만들다 보니까 자꾸 커지더라고요. 제일 큰 인형이 뭔가 했더니, 사람이 들어가는 거였어요. # say
실밥은 말하는 동안 한 번도 내 얼굴을 보지 않는다. 솔기만 본다. 그게 편하다.
실밥: 이건 언제 만들었어요? # say
* ["올해요." # at: up]
    올해요.
* ["…넉 달 걸렸어요." # at: left]
    …넉 달 걸렸어요.
- 나쁜 해에 만들었다. 그 방에서 보낸 해 중에 나쁘지 않은 해는 없었다.
그런데 삼색이는 그해에 있었던 것 중에 유일하게 나쁘지 않은 것이다.
실밥의 엄지가 헤드 안쪽을 훑는다. 안감을 따라, 천천히. 그 자리로 간다.
* [손을 무릎에 누른다 # game: lining held]
    엄지가 납작한 것 위에서 멈춘다.
    실밥: 안감 안에 뭐가 들었네요. 납작한 거. # say
    ~ stare(20)
    무릎 위에서 손이 떨린다. 실밥이 그 손을 본다. 무릎을 누르고 있는 손을. 엄지를 뗀다.
* [손을 무릎에 누른다 # game: lining grab]
    실밥: 안감 안에 뭐가 들었네요. 납작한 거. # say
    ~ stare(20)
    손이 먼저 나간다. 빼앗으려고.
    실밥은 내 손을 보고, 엄지를 뗀다.
-
실밥: 아. 미안해요. # say
실밥: 부적이구나. 나도 넣어요. 우리 할머니 단추. # say
헤드가 돌아온다. 두 손으로, 얼굴이 내 쪽을 향하게.
~ gaze = 10
실밥: 이 털 남는 거 나한테 있어요. 주황이랑 검정. 보내 줄게요. 수선할 때 써요. # say
실밥이 영수증 뒷면과 볼펜을 내민다.
실밥: 주소. # say
* [주소를 적는다 # at: table]
- 볼펜을 쥔다.
시, 구, 동까지는 쓴다. 그다음이 문제다.
'영구임대'.
그 네 글자를 사람에게 적어 주는 건 처음이다. 택배 주문서에만 써 봤다.
적는다. 2단지. 108동. 호수.
실밥이 받아서 읽는다. 눈이 그 네 글자 위를 지나간다. 걸리지 않는다.
접어서 반짇고리 뚜껑 안쪽에 끼운다.
실밥: 받는 사람은 삼색이로 쓸게요. 본명은 안 물어요. # say
실밥: 바쁜 거 끝나면 부칠게요. 늦어도 욕하지 마요. # say
곰표: 자, 입읍시다. 누가 에어컨 십팔 도로 내려요. # say
-> c2_suitup

// ── 탈을 쓴 무리 ──
=== c2_suitup ===
# scene: partyroom_changing
# npc: hyunwoo off
# npc: gombyo off
# npc: silbap off
# pose: stand
# pos: changing
# npc: moka moka_zip
작은 방에서 갈아입는다. 등 지퍼는 모카가 올려 준다. 옷걸이도 끈도 필요 없다.
# suit: body
* [헤드를 쓴다 # at: wait]
- # suit: on
# voice_stop
# ui: gaze_hide
# ui: heat_show
~ suit_on = true
~ heat = 15
~ gaze = 0
조용해진다.
# scene: partyroom_warm
# npc: moka off
# npc: bear bear_wave
# npc: rabbit seat_sofa
# npc: dog dog_spot
* [방으로 나간다 # at: z_mid]
- # go: room_mid
곰이 있다. 이 미터짜리 불곰. 곰이 나를 보고 두 팔을 번쩍 든다.
토끼가 있다. 회색 토끼가 소파 등받이에 걸터앉아 발을 까딱인다.
# npc: fox small_in
작은 방 문이 열리고, 여우가 나온다.
# npc: fox fox_greet walk
붉은 여우. 꼬리가 내 것의 두 배다.
정장 입은 남자는 어디에도 없다.
여우가 나를 향해 손을 흔든다. 크게, 온몸으로.
* [손을 흔든다 # at: up]
    # emote: wave
    마주 흔든다. 여우가 더 크게 흔든다. 나도 더 크게 흔든다. 지는 쪽이 없다.
* [하트를 만든다 # at: right]
    # emote: heart
    찌그러진 감자를 만든다. 여우가 가슴을 움켜쥐고 뒤로 쓰러진다. 소파가 받아 준다.
* [웅크린다 # at: down]
    # emote: curl
    몸을 만다. 여우가 달려와서 옆에 똑같이 쪼그려 앉는다. 그러고는 고개를 기울여 내 눈구멍을 들여다본다.
- 누가 음악을 튼다. 트로트다.
곰이 춤을 춘다.
구청 공무원이, 불곰이 되어, 어깨를 턴다. 박자를 정확하게 탄다. 십이 년의 경력이다.
# pause: 1
웃었다.
이번에는 안다.
탈 안에서 볼이 폼에 눌린다. 소리도 났다. 내 웃음소리를 내가 듣는다.
이런 소리였나.
반 박자 늦지 않았다.
~ strength++
모카: 사진! 사진 찍어요! 타이머 십 초! # say
# npc: bear bear_photo walk
# npc: rabbit photo_left walk
# npc: fox photo_right walk
# npc: dog photo_dog walk
-> c2_group

=== c2_group ===
* [가운데에 선다 # at: z_center]
    가운데로 간다. 발이 알아서 갔다.
    여우가 오른쪽에, 토끼가 왼쪽에 붙는다.
* [끝에 선다 # at: z_edge]
    끝에 선다. 프레임에서 반쯤 나가는 자리.
    여우 팔이 뻗어 와서 내 어깨를 잡고 가운데로 끌어다 놓는다.
    # go: photo_center
- 십. 구. 팔.
곰이 뒤에서 전부를 끌어안는다.
~ heat = 85
* [그대로 버틴다 # game: photo clear]
    곰의 팔 안에 여우와 토끼와 강아지와 고양이가 들어간다.
    덥다. 미친 듯이 덥다. 아무도 빠져나가지 않는다. 나도.
* [그대로 버틴다 # game: photo blur]
    몸이 먼저 풀렸다. 셔터 소리와 같이 어깨가 내려갔다.
    사진 속 고양이만 조금 흔들렸을 것이다. 아무도 다시 찍자고 하지 않는다. 그게 좋다.
- # cut: group_photo
유리창이 없다.
난로가 여기 있다.
~ connection++
~ connection++
-> c2_lounge

// ── 머리를 벗는 방 ──
=== c2_lounge ===
# scene: partyroom_lounge
# suit: head_off
# pos: lounge_me
# npc: bear bear_wave
# npc: rabbit seat_sofa
# npc: dog dog_spot
# npc: fox off
# voice_back
~ heat = 40
선풍기 두 대가 도는 작은 방. 머리는 여기서만 벗는다. 규칙이다.
목소리가 돌아온다.
그런데 멀다. 옆집 TV 소리 같다. 무슨 말인지 들리지 않는다.
# npc: fox lounge_door
# npc: fox lounge_stand walk
여우가 들어와서 머리를 벗는다.
# npc: fox off
# npc: hyunwoo_fox seat_bench
현우다. 앞머리가 젖어서 이마에 붙었다. 물병을 하나 던져 준다.
* [받는다 # game: catchb caught]
    # emote: reach
    두 손으로 받는다. 젤리에 차가운 물방울이 맺힌다.
* [받는다 # game: catchb dropped]
    물병이 손끝을 맞고 바닥을 구른다. 현우가 웃으며 발로 굴려 보내 준다.
- 현우: 살았다. 팔월에 풀슈트는 진짜 사람이 할 짓이 아니에요. # say
현우: 그래서 사람이 아닌 걸로 하는 거지만. # say
# sfx: phone_buzz
현우의 휴대폰이 떤다. 화면에 두 글자가 뜬다. '팀장'.
현우가 받기 전에 선풍기를 본다. 두 대가 웅웅 돈다. 집에서는 안 나는 소리다.
* [선풍기를 끈다 # at: fan]
- # sfx: switch_off
바람이 멎는다. 현우가 나를 보고 고개를 한 번 숙인다. 그리고 받는다.
현우의 얼굴이 바뀐다. 눈썹이 먼저, 그다음에 입이.
현우: 네, 팀장님. 기현우입니다. # say
목소리가 반 음 내려간다. 말끝이 다림질한 것처럼 펴진다.
현우: 아, 네. 네. 그 건은 월요일 오전에 제가 바로 처리하겠습니다. # say
현우: 아닙니다. 지금 집입니다. 네, 쉬고 있었습니다. # say
현우: 네. 들어가십시오. # say
끊는다.
* [선풍기를 다시 켠다 # at: fan]
    # sfx: switch_on
    바람이 다시 돈다. 못 들은 척하는 데에는 이게 제일 낫다.
-
여우 몸에 사람 머리를 한 남자가 휴대폰을 엎어 놓고, 숨을 길게 뱉는다.
현우: …들었죠. # say
현우: 저게 본캐예요. 아니다, 부캐인가. 이제 나도 몰라. # say
현우: 집이라고 했네. 뭐, 맞지. 여기가 더 집 같으니까. # say
-> c2_lounge_reply

=== c2_lounge_reply ===
* [끄덕인다 # at: up]
    # emote: nod
* ["…알 것 같아요." # at: left]
    ~ connection++
    …알 것 같아요.
    현우가 나를 본다. 처음으로 삼 초보다 길게.
    현우: 그쵸. 알 것 같았어요, 삼색이님은. # say
+ [(잠김) "저는 사 년째 집에만 있어요"라고 한다 # at: right]
    이 사람에게 집은 쉬는 곳이다. 내 집은 그런 뜻이 아니다. # fail
    그 차이를 설명하려면 전부를 말해야 한다. # fail
    -> c2_lounge_reply
- 현우는 다시 여우 머리를 쓴다. 쓰기 전에 한 번 웃는다. 팀장에게는 보여 주지 않는 쪽 얼굴로.
# npc: hyunwoo_fox off
# npc: fox seat_bench
-> c2_pills

=== c2_pills ===
# scene: partyroom_restroom
# pos: in
# npc: hyunwoo sink_hw
# pause: 1
해산하기 전에 세수를 하러 간다.
* [세면대 # at: sink]
- 세면대 앞에 현우가 있다. 셔츠 차림으로 돌아와 있다. 작은 비닐 봉지를 이로 뜯는다.
알약 세 개. 물도 없이 털어 넣고, 수도꼭지에 입을 댄다.
거울 속에서 눈이 마주친다.
~ saw_pills = true
현우: 비타민. # say
현우: 점심 거를 까먹어서. # say
웃는다. 봉지는 벌써 주머니에 들어갔다.
나는 그 봉지를 안다.
날짜와 '점심'이 인쇄된, 하루치씩 뜯어 먹게 되어 있는 봉지. 석 달을 먹었다.
비타민은 그렇게 주지 않는다.
-> c2_pills_reply

=== c2_pills_reply ===
* [끄덕인다 # at: up]
    # emote: nod
    끄덕인다. 비타민이라고 했으니까 비타민이다.
* [못 본 척 세수를 한다 # at: left]
    # pose: stoop
    물을 튼다. 얼굴을 숙인다. 물이 차다.
    # pose: stand
    고개를 들었을 때 현우는 넥타이를 주머니에서 꺼내 펴고 있다.
+ [(잠김) "저도 먹었어요"라고 한다 # at: right]
    그러면 왜 끊었냐고 물을 것이다. # fail
    아버지가 버렸다는 말을, 구두 신은 사람 앞에서 할 수는 없다. # fail
    -> c2_pills_reply
- -> c2_walk

// ── 돌아오는 길 ──
=== c2_walk ===
# scene: street_evening_wet
# suit: off
# carry: bag
# ui: heat_hide
# ui: gaze_show
# time: 18:40
~ suit_on = false
~ heat = 0
~ gaze = 30
# npc: hyunwoo_case hw_start
비가 한 번 더 지나간 저녁. 아스팔트에 간판 불빛이 번진다.
현우가 역까지 같이 걷는다. 캐리어를 끈다. 안에 여우가 접혀 있다.
내 등에는 고양이가 업혀 있다.
겉으로 보면 출장 가는 회사원과 휴가 나온 군인이다.
# npc: hyunwoo_case hw_walk walk
* [역 쪽으로 걷는다 # at: z_walk]
- 현우: 나는 고등학교 때 그림 올리는 사이트에서 시작했어요. 여우만 그렸어요. 왜 여우냐면, 꼬리가 그리기 재밌어서. # say
현우: 거기서 댓글 달아 주던 사람이 곰표님이랑 실밥님이에요. 십 년 됐네. # say
현우: 그래서 회사에 친구가 없어도 괜찮아요. 친구는 따로 있으니까. # say
# pause: 1
현우: 회사 사람들은 내가 여기 있는 거 몰라요. # say
현우: 평생 모를 거야. # say
현우: 알면 뭐, 잘리지는 않겠죠. 근데 잘리는 것보다 싫은 게 있잖아요. # say
현우: 회식 때마다 그 얘기 나오는 거. '기 대리, 오늘은 꼬리 안 달고 왔어?' # say
웃는다. 눈은 웃지 않는다.
현우: 삼색이님은요. 집에서는 알아요? # say
* [고개를 젓는다 # at: wait]
    # emote: shake
- 현우: 그쵸. # say
현우: 우리 다 그래요. # say
현우: 곰표님은 구청 소식지에 곰 사진이 실렸는데, 구청 사람들은 그게 곰표님인 줄 몰라요. # say
현우: 나쁜 짓을 하는 것도 아닌데. 말하면 상대 표정이 바뀌잖아요. 그 일 초가 싫어서. # say
# pause: 2
{ said_yes:
    현우: 오늘 와 줘서 고마워요. 간다고는 했는데, 솔직히 반반이라고 생각했어요. # say
- else:
    현우: 오늘 와 줘서 고마워요. 솔직히 안 올 줄 알았어요. # say
}
현우: 다음 달에도 해요. 또 와요. 피자는 곰표님이 사는 걸로 하고. # say
-> c2_walk_reply

=== c2_walk_reply ===
* ["…올게요." # at: left]
    ~ connection++
    …올게요.
    현우: 스샷 못 찍는 게 아쉽네. 방금 그거 증거로 남겨야 되는데. # say
* [끄덕인다 # at: up]
    # emote: nod
    현우: 끄덕인 거 봤어요. 그거 계약이에요. 내가 보험 파는 사람이라 잘 알아. # say
+ [(잠김) "오늘 사 년 만에 웃었어요"라고 한다 # at: right]
    그 말은 너무 커서 입을 빠져나오지 못했다. # fail
    -> c2_walk_reply
- 역 입구에서 헤어진다.
# go: me_gate
# npc: hyunwoo_case hw_down walk
현우는 계단을 내려가면서 주머니에서 넥타이를 꺼내 다시 맨다. 토요일 저녁인데.
누구를 만나러 가는 건지, 그냥 버릇인지는 모른다.
# npc: hyunwoo_case off
-> c2_home

=== c2_home ===
# scene: subway
# pos: seat_me
# pose: sit
# npc: pb seat_b
# npc: pd seat_d
# npc: pf seat_f
돌아가는 지하철에서는 숨이 막히지 않았다.
나아져서가 아니다. 다 써서다. 막힐 숨이 남아 있지 않았다.
가방을 안고 잤다. 내릴 역 두 정거장 전에 깼다.
# ui: phone_open
휴대폰에 사진이 한 장 와 있다.
곰과 여우와 토끼와 강아지 사이에 고양이가 있다. 처진 귀가 여우 어깨에 닿아 있다.
모카: 오늘의 단체샷!! 삼색이님 첫 정모 기념!! # msg
# ui: messenger_close
# scene: complex_night
# time: 21:10
# pos: from_play
단지. 놀이터에는 아무도 없다. 아직 새벽 세 시가 아니니까.
* [108동 현관으로 들어간다 # at: homedoor]
- 108동. 엘리베이터. 11층.
# scene: corridor_night_glass
# pos: from_lift
# ui: gaze_hide
# pause: 2
* [복도를 걷는다 # at: z_light]
- 현관 앞 바닥에 초록색이 흩어져 있다.
병이다. 병이었던 것.
문 안에서 TV 소리가 난다. 크다.
이 집에서 TV 소리가 크면.
# pause: 2
아무 일도 없다는 뜻이다.
재밌었냐. # voice
너 웃는 동안 여기는 이랬어. # voice
* [유리 조각을 넘는다 # at: move]
- 유리 조각을 넘는다. 고양이를 끌어안고.
# go: at_door
# sfx: doorlock_beep_open
삑삑삑삑. 띠리릭.
나는 한 번에 누른다.
-> c2_end

=== c2_end ===
# chapter_end: 2
# scene: black
-> ch3
