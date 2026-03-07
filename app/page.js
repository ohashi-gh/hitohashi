'use client';

import { useState, useEffect, useRef } from 'react';
import './globals.css';

// ── iOS ネイティブブリッジ ────────────────────────────────
const isNative = typeof window !== 'undefined' && window.nativeApp?.isNative;
const isIOS    = typeof window !== 'undefined' && window.nativeApp?.platform === 'ios';

function haptic(style = 'medium') {
  if (isNative && window.nativeApp?.haptic) {
    window.nativeApp.haptic(style);
  }
}
function notifyChallengeComplete() {
  if (isNative && window.nativeApp?.challengeComplete) {
    window.nativeApp.challengeComplete();
  }
}
function scheduleNotification(hour, title, body) {
  if (isNative && window.nativeApp?.scheduleNotification) {
    window.nativeApp.scheduleNotification(hour, title, body);
  }
}

// ── デザイントークン ──────────────────────────────────────
const T = {
  sage:'#4a7c59', sageL:'#6a9e78', sageXL:'#e8f4ec',
  cream:'#faf7f2', sand:'#f0ead8',
  amber:'#e8a838', amberL:'#fdf0d5',
  rose:'#d4756b',  roseL:'#fbeae8',
  ink:'#1e2a20',   inkM:'#4a5e4d',  inkL:'#8a9e8d',
  white:'#ffffff', border:'#e2ddd4',
  purple:'#7c6dc9',purpleL:'#ede9fe',
  blue:'#4a90d9',  blueL:'#dbeafe',
  teal:'#2d9596',  tealL:'#ccf2f1',
};

// ── ストレージ ────────────────────────────────────────────
async function sget(key) {
  try {
    if (typeof window === 'undefined') return null;
    // Claude Artifact storage → localStorage fallback
    if (window.storage) {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    }
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}
async function sset(key, val) {
  try {
    if (typeof window === 'undefined') return;
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(val));
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {}
}

// ── Anthropic API ─────────────────────────────────────────
async function callClaude(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const d = await res.json();
    return d.text || '';
  } catch { return ''; }
}

// ── 音声ガイド ────────────────────────────────────────────
function speak(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP'; u.rate = 0.88; u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.find(v => v.lang.startsWith('ja'));
  if (ja) u.voice = ja;
  window.speechSynthesis.speak(u);
}
function stopSpeak() {
  if (typeof window !== 'undefined' && window.speechSynthesis)
    window.speechSynthesis.cancel();
}

// ── ユーティリティ ────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getTodayChallenge() {
  const k = todayKey();
  const idx = [...k].reduce((a,c) => a + c.charCodeAt(0), 0) % CHALLENGES.length;
  return CHALLENGES[idx];
}

// ════════════════════════════════════════════════════════════
// チャレンジデータ（25種）
// ════════════════════════════════════════════════════════════
const CHALLENGES = [
  // ── 体 ──────────────────────────────────────────────────
  { id:'neck-roll', cat:'体', icon:'🔄', color:T.sage, colorL:T.sageXL,
    title:'首のほぐしストレッチ', tagline:'デスクワークの疲れをリセット', diff:'超簡単', mins:2,
    intro:'椅子に座ったまま首をゆっくり動かして固まった筋肉をほぐします。痛みがあれば無理せず止めてください。',
    steps:[
      {t:'肩の力を抜く',d:'背筋を伸ばし、両肩をぐっと上げてからストンと落とします。これを2回。',s:15,a:'breathe'},
      {t:'右に傾ける',d:'頭をゆっくり右肩に近づけます。左側の首筋が伸びるのを感じながら15秒キープ。',s:20,a:'tilt-right'},
      {t:'左に傾ける',d:'今度は左側。右の首筋が伸びます。呼吸は止めずに。',s:20,a:'tilt-left'},
      {t:'前に倒す',d:'あごを胸に近づけます。首の後ろが伸びているのを感じて15秒。',s:15,a:'tilt-down'},
      {t:'ゆっくり回す',d:'首を右回りにゆっくり1周。次に左回りに1周。肩は動かさないように。',s:30,a:'rotate'},
      {t:'完了',d:'目を閉じて首周りの変化を感じてください。お疲れさまでした。',s:20,a:'breathe'},
    ]},
  { id:'shoulder-blade', cat:'体', icon:'💪', color:T.rose, colorL:T.roseL,
    title:'肩甲骨ほぐし', tagline:'背中の重だるさを5分で解消', diff:'ふつう', mins:3,
    intro:'長時間の座り仕事で固まった肩甲骨周りをほぐします。立っても座ってもできます。',
    steps:[
      {t:'肩を上げる',d:'両肩を耳に近づけるようにぐっと上げ、3秒キープしてドーンと落とします。3回。',s:20,a:'breathe'},
      {t:'前回し×5',d:'腕を体の横に垂らし、肩だけを前→上→後→下と大きくゆっくり5回回します。',s:25,a:'rotate'},
      {t:'後ろ回し×5',d:'逆方向へ。肩甲骨が動く感覚を意識して。',s:25,a:'rotate'},
      {t:'腕組みで丸める',d:'両腕を前で組んで背中を丸めます。肩甲骨が左右に広がるのを10秒感じて。',s:15,a:'tilt-down'},
      {t:'胸を開く',d:'両手を後ろで組んで胸を張ります。肩甲骨を背中の中央に寄せるイメージで10秒。',s:15,a:'tilt-up'},
      {t:'完了',d:'深呼吸を1回。肩周りの変化を感じてください。',s:20,a:'breathe'},
    ]},
  { id:'eye-rest', cat:'体', icon:'👁️', color:T.blue, colorL:T.blueL,
    title:'目の休憩 20-20-20', tagline:'スマホ疲れを1分でリセット', diff:'超簡単', mins:1,
    intro:'眼科医推奨の「20-20-20ルール」。20分ごとに6m先を20秒見るだけで目の疲れが回復します。',
    steps:[
      {t:'画面から離す',d:'スマホ・PC画面から目を離します。このアプリも一旦置いて構いません。',s:5,a:'breathe'},
      {t:'遠くを見る',d:'6m以上先（窓の外・部屋の奥）をぼんやり見ます。ピントを合わせようとしなくていい。',s:20,a:'hold'},
      {t:'目を閉じる',d:'ゆっくり目を閉じます。目の奥の緊張が抜けていく感覚を20秒感じて。',s:20,a:'breathe'},
      {t:'完了',d:'目を開けたら、まず遠くを見てから手元に戻します。',s:15,a:'exhale'},
    ]},
  { id:'water-ritual', cat:'体', icon:'💧', color:T.teal, colorL:T.tealL,
    title:'水を飲む儀式', tagline:'体を内側からリセットする1分', diff:'超簡単', mins:1,
    intro:'ただ水を飲むのではなく、意識を向けながら飲む「儀式」にします。体への感謝と気づきの1分間。',
    steps:[
      {t:'コップを用意する',d:'水かお茶をコップ1杯用意します。常温か少し温かいものがおすすめ。',s:15,a:'breathe'},
      {t:'一口目',d:'まず一口だけ飲みます。水が喉を通る感覚を感じながら、ゆっくりと。',s:15,a:'inhale'},
      {t:'ゆっくり飲む',d:'残りをゆっくり飲みます。「体が潤っていく」と意識しながら。',s:20,a:'breathe'},
      {t:'感じる',d:'飲み終えたら目を閉じて10秒。体の内側が少し変わった感覚はありますか？',s:10,a:'hold'},
    ]},
  { id:'posture-reset', cat:'体', icon:'🧍', color:T.amber, colorL:T.amberL,
    title:'姿勢リセット', tagline:'30秒で正しい姿勢を取り戻す', diff:'超簡単', mins:1,
    intro:'崩れた姿勢をリセットする簡単なルーティン。壁があればより効果的ですが、なくてもできます。',
    steps:[
      {t:'壁に背をつける',d:'背中・お尻・かかとを壁につけます。壁がない場合は意識するだけでOK。',s:15,a:'breathe'},
      {t:'頭の位置',d:'あごを引いて耳と肩が一直線になるように。頭の後ろが壁に軽く触れるイメージ。',s:20,a:'tilt-up'},
      {t:'肩甲骨を寄せる',d:'両肩を少し後ろに引いて胸を開きます。胸骨が上を向くイメージ。',s:20,a:'breathe'},
      {t:'この姿勢を記憶する',d:'今の姿勢を体に覚えさせます。「これが自然な姿勢」と意識して20秒。',s:20,a:'hold'},
      {t:'完了',d:'30分ごとにこれを繰り返すと効果的です。',s:15,a:'breathe'},
    ]},
  { id:'hand-stretch', cat:'体', icon:'🤲', color:'#c17f4a', colorL:'#fde8cc',
    title:'手首・指のほぐし', tagline:'タイピング疲れをすぐに解消', diff:'超簡単', mins:2,
    intro:'長時間のキーボード・スマホ操作で固まった手首と指をほぐします。腱鞘炎予防にも効果的。',
    steps:[
      {t:'指を広げる',d:'両手を前に出し、指を思い切り広げて3秒、グーに握って3秒。これを5回。',s:30,a:'breathe'},
      {t:'手首を回す',d:'両手をグーにして、手首を内回りに5回、外回りに5回ゆっくり回します。',s:25,a:'rotate'},
      {t:'指を反らせる',d:'右手の指を左手で軽く後ろに反らせます。15秒。反対側も。',s:30,a:'tilt-up'},
      {t:'手のひらを押す',d:'両手を合わせて「合掌」の形に。手のひら同士で軽く押し合い15秒。',s:20,a:'hold'},
      {t:'完了',d:'手をブラブラと振って終わります。',s:15,a:'breathe'},
    ]},
  { id:'morning-stretch', cat:'体', icon:'🌅', color:'#d97706', colorL:'#fef3c7',
    title:'起き抜け全身ほぐし', tagline:'ベッドの上で3分、体を目覚めさせる', diff:'ふつう', mins:3,
    intro:'目が覚めたらそのままベッドや布団の上でできるストレッチ。寝ている間に固まった体を優しくほぐします。',
    steps:[
      {t:'体を伸ばす',d:'両手を頭上に伸ばして、つま先まで全身をグーッと伸ばします。ゆっくり5秒。',s:15,a:'tilt-up'},
      {t:'膝を胸に引く',d:'仰向けのまま両膝を抱えて胸に引き寄せます。腰が伸びるのを感じながら20秒。',s:25,a:'tilt-down'},
      {t:'体をひねる',d:'仰向けで両膝を立て、右に倒します。肩は床につけたまま。15秒。左側も。',s:30,a:'rotate'},
      {t:'体側を伸ばす',d:'座って、右腕を頭上に上げて左に傾けます。右の体側が伸びます。15秒ずつ。',s:30,a:'tilt-right'},
      {t:'完了',d:'大きく深呼吸を1回。今日も1日始まります。',s:20,a:'breathe'},
    ]},
  // ── 心 ──────────────────────────────────────────────────
  { id:'box-breathing', cat:'心', icon:'🌬️', color:T.purple, colorL:T.purpleL,
    title:'ボックス呼吸法', tagline:'4秒で心を落ち着かせる', diff:'超簡単', mins:2,
    intro:'緊張・不安・ストレスに即効性のある呼吸法。軍や医療現場でも使われています。4秒×4のリズムで。',
    steps:[
      {t:'姿勢を整える',d:'背筋を伸ばして座るか横になります。手はお腹に置いて。',s:10,a:'breathe'},
      {t:'4秒 吸う',d:'鼻からゆっくり4秒かけて吸います。お腹が膨らむのを感じて。1…2…3…4',s:4,a:'inhale'},
      {t:'4秒 止める',d:'息を止めます。体の中に空気を満たしたまま。1…2…3…4',s:4,a:'hold'},
      {t:'4秒 吐く',d:'口からゆっくり4秒かけて吐きます。お腹がへこみます。1…2…3…4',s:4,a:'exhale'},
      {t:'4秒 止める',d:'空の状態で止めます。1…2…3…4',s:4,a:'hold'},
      {t:'もう1サイクル',d:'同じリズムで続けます。吸って…止めて…吐いて…止めて。',s:16,a:'inhale'},
      {t:'3サイクル目',d:'最後のサイクル。丁寧に。',s:16,a:'inhale'},
      {t:'完了',d:'自然な呼吸に戻します。心と体の変化を感じてください。',s:30,a:'breathe'},
    ]},
  { id:'gratitude', cat:'心', icon:'🙏', color:T.amber, colorL:T.amberL,
    title:'感謝の瞬間', tagline:'今日ひとつ、ありがとうを見つける', diff:'超簡単', mins:2,
    intro:'感謝を意識するだけで幸福感・睡眠の質・免疫機能が改善します。難しく考えずに、ただ探すだけ。',
    steps:[
      {t:'目を閉じる',d:'目を閉じて今日1日を静かに振り返ります。評価しなくていい、ただ眺めるだけ。',s:20,a:'breathe'},
      {t:'1つ探す',d:'「今日、少し良かったこと」を1つ探します。どんな小さなことでも大丈夫。',s:25,a:'hold'},
      {t:'感じる',d:'それを心の中で思い浮かべて「ありがとう」と心で言います。感情が湧いてきたら大切に。',s:25,a:'breathe'},
      {t:'完了',d:'目を開けます。感謝の気持ちは、次の行動の燃料になります。',s:20,a:'exhale'},
    ]},
  { id:'body-scan', cat:'心', icon:'🔍', color:'#5b6ac9', colorL:'#e8eaf6',
    title:'ボディスキャン', tagline:'体の緊張を上から下へ解いていく', diff:'ふつう', mins:4,
    intro:'頭のてっぺんから足の先まで、意識をゆっくり移動させながら体の緊張を解きます。不眠・不安にも効果的。',
    steps:[
      {t:'楽な姿勢に',d:'横になるか、椅子に深く腰かけます。目を閉じて。',s:15,a:'breathe'},
      {t:'頭・顔',d:'額のしわ、目の周り、頬、顎。意識を向けながら力を抜きます。',s:25,a:'breathe'},
      {t:'首・肩',d:'首の後ろ、肩の上。知らず知らず力が入っている場所を見つけて、ゆっくり解きます。',s:25,a:'breathe'},
      {t:'胸・お腹',d:'呼吸のたびに胸が上下しているのを感じます。お腹も自然に動かして。',s:25,a:'inhale'},
      {t:'腕・手',d:'二の腕から手の先まで。指先に少しじーんとする感覚があればOK。',s:20,a:'breathe'},
      {t:'腰・足',d:'腰の重さを床や椅子に預けます。太もも、ふくらはぎ、足の裏まで。',s:25,a:'breathe'},
      {t:'完了',d:'全身が少し軽くなった感覚はありますか？ゆっくり目を開けます。',s:25,a:'exhale'},
    ]},
  { id:'self-compassion', cat:'心', icon:'💚', color:'#38a169', colorL:'#c6f6d5',
    title:'自己慈悲のひとこと', tagline:'自分に優しい言葉をかける練習', diff:'超簡単', mins:2,
    intro:'自己批判をやめて自分を友人のように扱う練習。ネガティブな感情を打ち消すのではなく、ただ受け入れます。',
    steps:[
      {t:'今の気持ちを認める',d:'今どんな気持ちですか？辛い・疲れた・うまくいかない、なんでもOK。それを心の中で認めます。',s:25,a:'breathe'},
      {t:'誰でもそうだと知る',d:'「これは自分だけじゃない」。世界中に同じように感じている人がいます。',s:20,a:'hold'},
      {t:'友人に話すように',d:'もし友人が同じ悩みを抱えていたら、なんと言いますか？その言葉を自分にかけてみて。',s:30,a:'breathe'},
      {t:'完了',d:'自分に優しくすることは、弱さではなく強さです。',s:25,a:'breathe'},
    ]},
  { id:'5-4-3-2-1', cat:'心', icon:'🌿', color:T.teal, colorL:T.tealL,
    title:'5-4-3-2-1グラウンディング', tagline:'不安・パニックを今この瞬間に戻す', diff:'超簡単', mins:3,
    intro:'5つの感覚を使って「今ここ」に意識を戻す技法。不安が強いとき、心が過去や未来に飛んでいるときに。',
    steps:[
      {t:'目で見る',d:'今見えているものを5つ心の中でリストアップします。時計、窓、テーブル…',s:30,a:'hold'},
      {t:'耳で聴く',d:'今聞こえている音を4つ。エアコン、外の音、自分の呼吸…',s:25,a:'hold'},
      {t:'体で感じる',d:'体が触れているものを3つ。椅子の感触、床の硬さ、服の生地…',s:20,a:'breathe'},
      {t:'嗅ぐ',d:'今感じる匂いを2つ。何もなくてもOK、ただ鼻に意識を向けるだけで。',s:20,a:'inhale'},
      {t:'味わう',d:'口の中の味を1つ。何もなければ、舌の感覚だけでも。',s:15,a:'hold'},
      {t:'完了',d:'今、ここにいます。過去でも未来でもなく、今この瞬間に。',s:20,a:'breathe'},
    ]},
  { id:'worry-time', cat:'心', icon:'📋', color:'#805ad5', colorL:'#e9d8fd',
    title:'心配事を書き出す', tagline:'頭の中を紙に出してスッキリさせる', diff:'ふつう', mins:3,
    intro:'漠然とした不安を具体的な言葉にするだけで、脳の処理負担が下がります。紙とペンを用意してください。',
    steps:[
      {t:'紙とペンを用意',d:'メモ帳・裏紙・スマホのメモ、何でもOKです。',s:15,a:'breathe'},
      {t:'全部書き出す',d:'今頭の中にある心配事や気になることを全部書き出します。小さいことも全部。評価しない。',s:60,a:'hold'},
      {t:'コントロールできるか？',d:'それぞれに「自分でコントロールできる」か「できない」かを印します。できないことは手放していい。',s:30,a:'breathe'},
      {t:'1つだけ選ぶ',d:'コントロールできることの中から「今日できること」を1つだけ選びます。',s:25,a:'breathe'},
      {t:'完了',d:'紙に書いた心配事は、頭の外に出ました。少し軽くなった感じはありますか？',s:20,a:'exhale'},
    ]},
  { id:'evening-reflection', cat:'心', icon:'🌙', color:'#4a5568', colorL:'#e2e8f0',
    title:'夜の3行日記', tagline:'今日を3つの問いで振り返る', diff:'超簡単', mins:3,
    intro:'長い日記は続かない。3つの問いに答えるだけで、自己理解が深まり睡眠の質も上がります。',
    steps:[
      {t:'準備',d:'ペンと紙を用意します。横になったままでもOK。',s:10,a:'breathe'},
      {t:'今日うまくいったこと',d:'「今日、うまくいったことは何？」。どんな小さなことでも書きます。',s:40,a:'breathe'},
      {t:'今日感謝できること',d:'「今日、感謝できることは？」。できごと・人・もの、なんでもOK。',s:40,a:'hold'},
      {t:'明日ひとつだけ',d:'「明日、ひとつだけやることは？」。欲張らず1つだけ。',s:30,a:'breathe'},
      {t:'完了',d:'3行書けました。頭を空っぽにして休んでください。',s:20,a:'exhale'},
    ]},
  // ── 仕事 ────────────────────────────────────────────────
  { id:'pomodoro-start', cat:'仕事', icon:'🍅', color:'#e53e3e', colorL:'#fed7d7',
    title:'ポモドーロスタート', tagline:'25分集中の準備を整える', diff:'超簡単', mins:2,
    intro:'集中できない原因の多くは「準備不足」です。作業の前に2分かけて環境と頭を整えると、集中力が大幅に上がります。',
    steps:[
      {t:'通知をオフに',d:'スマホの通知をオフにします。「通知をオフにするだけで生産性が23%上がる」という研究があります。',s:20,a:'breathe'},
      {t:'やることを1つ決める',d:'「次の25分でやること」を1つだけ決めます。複数はNG。',s:20,a:'hold'},
      {t:'デスクを片付ける',d:'目の前から余計なものをどけます。必要なものだけを手元に。',s:20,a:'breathe'},
      {t:'水を飲む',d:'コップ1杯の水を飲みます。脳は水分不足で集中力が下がります。',s:15,a:'inhale'},
      {t:'スタート宣言',d:'心の中で「よし、やるぞ」と言います。始める儀式が脳のスイッチを入れます。',s:15,a:'breathe'},
      {t:'完了',d:'準備完了。25分の集中タイムが始まります。',s:10,a:'exhale'},
    ]},
  { id:'brain-dump', cat:'仕事', icon:'🧠', color:'#d69e2e', colorL:'#fefcbf',
    title:'ブレインダンプ', tagline:'頭の中を空っぽにして集中力を取り戻す', diff:'ふつう', mins:3,
    intro:'頭の中の「やらなきゃ」「気になる」を全部紙に出す作業。これだけで集中力と判断力が回復します。',
    steps:[
      {t:'紙を用意する',d:'何でも書ける紙かメモアプリを開きます。',s:10,a:'breathe'},
      {t:'全部吐き出す',d:'今頭にあることを全部書きます。仕事・プライベート・「牛乳買わなきゃ」でも何でも。',s:60,a:'hold'},
      {t:'分類する',d:'書いたものを「今日やる」「後でやる」「誰かに頼む」「手放す」の4つに分けます。',s:40,a:'breathe'},
      {t:'今日1つ選ぶ',d:'「今日やる」の中から最重要の1つだけに丸をつけます。',s:20,a:'hold'},
      {t:'完了',d:'頭が軽くなりましたか？この1つに集中します。',s:10,a:'exhale'},
    ]},
  { id:'email-batch', cat:'仕事', icon:'📧', color:'#2b6cb0', colorL:'#bee3f8',
    title:'メール一気処理', tagline:'10分でメールの山を片付ける準備', diff:'ふつう', mins:2,
    intro:'メールに都度対応するのは集中力の大敵。1日2〜3回にまとめて処理する習慣をつけましょう。',
    steps:[
      {t:'全体を眺める',d:'受信箱を開かずに、件名だけを上からスキャンします。内容は読まない。',s:20,a:'breathe'},
      {t:'種類分けする',d:'「今日返信必須」「今週でいい」「読むだけ」「不要」の4種に分けるイメージで見ます。',s:30,a:'hold'},
      {t:'最重要から開く',d:'「今日返信必須」を最初に開きます。件名の印象だけで判断せず、本文を1回読んでから。',s:20,a:'breathe'},
      {t:'完了',d:'一気処理の準備完了。タイマーを10分セットしてスタートしましょう。',s:10,a:'exhale'},
    ]},
  { id:'decision-prep', cat:'仕事', icon:'⚖️', color:'#744210', colorL:'#fefcbf',
    title:'決断の準備', tagline:'悩みを構造化して決めやすくする', diff:'ふつう', mins:3,
    intro:'決断できないのは意志力の問題ではなく、情報の整理ができていないから。シンプルな構造化で解決します。',
    steps:[
      {t:'決断を1文で書く',d:'「何を決めるのか」を1文で書きます。曖昧なままだと判断できません。',s:20,a:'breathe'},
      {t:'選択肢を列挙',d:'選べる選択肢を全部書き出します。「AかBか」だけでなく「しないという選択肢」も。',s:30,a:'hold'},
      {t:'最悪を想像する',d:'各選択肢の「最悪のケース」を想像します。その最悪は本当に起きますか？',s:30,a:'breathe'},
      {t:'直感を聴く',d:'分析を横に置いて、今の直感は？「どちらに少しワクワクしますか？」',s:20,a:'inhale'},
      {t:'完了',d:'直感と分析が同じ方向を向いていれば、それが答えです。',s:20,a:'breathe'},
    ]},
  // ── 家 ──────────────────────────────────────────────────
  { id:'1min-reset', cat:'家', icon:'✨', color:'#5b9bd5', colorL:'#dbeafe',
    title:'1分リセット片付け', tagline:'タイマーが鳴るまで動くだけ', diff:'超簡単', mins:1,
    intro:'完璧に片付けなくていい。タイマーが鳴るまで、目に入るものを1つずつ元の場所に戻すだけ。',
    steps:[
      {t:'場所を1つ決める',d:'「今日はここだけ」と場所を決めます。デスク・テーブル・洗面台など1箇所。',s:10,a:'breathe'},
      {t:'動く',d:'目に入るものを1つずつ元の場所に戻します。考えすぎず、手を動かして。',s:40,a:'rotate'},
      {t:'完了',d:'完璧じゃなくていい。「少しマシ」が今日のゴール。よくやりました。',s:10,a:'breathe'},
    ]},
  { id:'kitchen-reset', cat:'家', icon:'🍽️', color:'#c17f4a', colorL:'#fde8cc',
    title:'キッチン3分リセット', tagline:'シンクだけ片付けると気持ちが変わる', diff:'超簡単', mins:3,
    intro:'「シンクをきれいにする習慣」を作るだけで、家全体の整理整頓が自然と進むという研究があります。',
    steps:[
      {t:'洗い物を全部出す',d:'シンクにある食器・コップを全部出します。まず現状を把握。',s:15,a:'breathe'},
      {t:'洗う',d:'食器を洗います。急がなくていい。泡立て、汚れを落として、すすぐ。',s:60,a:'rotate'},
      {t:'乾かす・しまう',d:'洗った食器を乾燥台に置くか、すぐしまえるものはしまいます。',s:30,a:'breathe'},
      {t:'シンクを磨く',d:'スポンジかクロスでシンクをサッと磨きます。光るだけで全然違います。',s:20,a:'rotate'},
      {t:'完了',d:'シンクがきれいになりました。小さな変化が気持ちをリセットしてくれます。',s:15,a:'breathe'},
    ]},
  { id:'declutter-3', cat:'家', icon:'📦', color:'#e53e3e', colorL:'#fed7d7',
    title:'3つ手放す', tagline:'使っていないものを3つ選ぶだけ', diff:'超簡単', mins:3,
    intro:'断捨離は大変そうに感じるけど、毎日3つ選ぶだけで1年で1000個のものが減ります。',
    steps:[
      {t:'1箇所を決める',d:'引き出し・棚・クローゼットの中から1箇所だけ選びます。全部やろうとしない。',s:15,a:'breathe'},
      {t:'手に取って判断',d:'手に取ったとき「ときめく」か？「この1年使った」か？NOなら手放し候補。',s:60,a:'hold'},
      {t:'3つ選ぶ',d:'手放し候補から3つだけ選びます。捨てる・売る・贈るのどれかを決めます。',s:30,a:'breathe'},
      {t:'袋に入れる',d:'決めたものを袋かボックスに入れます。目に見えなくなれば手放したも同然。',s:20,a:'exhale'},
      {t:'完了',d:'今日は3つ手放しました。空いたスペースに余白が生まれます。',s:15,a:'breathe'},
    ]},
  { id:'plant-care', cat:'家', icon:'🌱', color:T.sage, colorL:T.sageXL,
    title:'植物の世話', tagline:'生き物の存在が心をほぐす', diff:'超簡単', mins:2,
    intro:'植物の世話は「他者のケア」の最も手軽な形です。世話をしながら自分も整っていきます。',
    steps:[
      {t:'土を触る',d:'植物の土を触ってみます。乾いていますか？しっとりしていますか？',s:20,a:'breathe'},
      {t:'水やり',d:'乾いていたら水をあげます。「ちょうどいい量」は鉢底から少し水が出るくらい。',s:25,a:'inhale'},
      {t:'葉を拭く',d:'柔らかい布で葉を優しく拭きます。ほこりが取れると光合成の効率が上がります。',s:25,a:'breathe'},
      {t:'観察する',d:'新しい葉や茎が出ていませんか？変化を観察します。',s:20,a:'hold'},
      {t:'完了',d:'植物も、あなたのことも、少しずつ育っています。',s:10,a:'breathe'},
    ]},
  { id:'evening-routine', cat:'家', icon:'🕯️', color:'#6b46c1', colorL:'#e9d8fd',
    title:'就寝前のルーティン', tagline:'眠りの質を上げる5分の儀式', diff:'ふつう', mins:5,
    intro:'就寝前の5分を「脳をオフにする儀式」にすると、睡眠の質が大幅に改善します。',
    steps:[
      {t:'画面を暗くする',d:'スマホ・PC・TVをオフにします。ブルーライトは睡眠ホルモンを60%減らします。',s:15,a:'breathe'},
      {t:'明日の準備',d:'明日使うものを出しておきます。服・鍵・バッグ。朝の焦りがなくなります。',s:40,a:'hold'},
      {t:'深呼吸×5回',d:'鼻から4秒吸って、口から6秒吐きます。吐く時間を長くするのがポイント。5回。',s:50,a:'exhale'},
      {t:'今日のOKを探す',d:'「今日、自分をほめられること」を1つ心の中でつぶやきます。',s:25,a:'breathe'},
      {t:'完了',d:'よく頑張りました。ゆっくり休んでください。',s:10,a:'breathe'},
    ]},
  // ── つながり ─────────────────────────────────────────────
  { id:'thank-you', cat:'つながり', icon:'💌', color:T.rose, colorL:T.roseL,
    title:'感謝を届ける', tagline:'今日1人に「ありがとう」を伝える', diff:'超簡単', mins:2,
    intro:'感謝を表現することは、受け取る相手だけでなく、伝える自分の幸福感も高めます。',
    steps:[
      {t:'人を1人思い浮かべる',d:'今日感謝したい人を1人思い浮かべます。家族・友人・同僚・見知らぬ誰か。',s:20,a:'breathe'},
      {t:'何に感謝するか',d:'具体的に「どんなことへの感謝か」を考えます。曖昧な「ありがとう」より具体的な方が伝わります。',s:25,a:'hold'},
      {t:'メッセージを考える',d:'一言でいい。「先日の〇〇、助かりました」「いつも〇〇してくれてありがとう」',s:25,a:'breathe'},
      {t:'実際に伝える',d:'LINEでもメールでも直接でも。今すぐ送りましょう。',s:30,a:'exhale'},
      {t:'完了',d:'誰かの1日を、少し良くしました。',s:10,a:'breathe'},
    ]},
  { id:'active-listening', cat:'つながり', icon:'👂', color:'#4a7fa5', colorL:'#bee3f8',
    title:'傾聴の練習', tagline:'次の会話で、ただ聴くことを試みる', diff:'ふつう', mins:2,
    intro:'「聴くこと」は最も強力なコミュニケーションスキル。次の会話の前に意識を整えます。',
    steps:[
      {t:'スマホを置く',d:'次の会話の間は、スマホを裏返すか別の場所に置くと決めます。',s:15,a:'breathe'},
      {t:'アドバイスしない',d:'「アドバイスしない」と決めます。聴くことと、問題を解決することは別です。',s:20,a:'hold'},
      {t:'相槌の種類を増やす',d:'「うん」だけでなく「それは大変だったね」「もっと聞かせて」を意識して使います。',s:20,a:'breathe'},
      {t:'最後に確認する',d:'「つまり〇〇ってこと？」と要約して確認することで、相手は「聴いてもらえた」と感じます。',s:20,a:'hold'},
      {t:'完了',d:'今日の会話で、この1つだけ試してみてください。',s:15,a:'breathe'},
    ]},
  { id:'reconnect', cat:'つながり', icon:'📱', color:'#d69e2e', colorL:'#fefcbf',
    title:'疎遠になった人に連絡する', tagline:'「元気？」の一言でいい', diff:'超簡単', mins:2,
    intro:'「連絡しようと思ってたのに」と思い続けている人は誰かいますか？今日がその日かもしれません。',
    steps:[
      {t:'人を1人思い浮かべる',d:'最近会っていない、でも気になっている人を1人思い浮かべます。',s:20,a:'breathe'},
      {t:'ハードルを下げる',d:'長いメッセージは必要ありません。「元気？最近どう？」だけで十分です。',s:20,a:'hold'},
      {t:'送る',d:'今すぐ送ります。完璧な文章を考えなくていい。「元気？」だけでいい。',s:20,a:'exhale'},
      {t:'完了',d:'人と人のつながりは、小さなアクションから始まります。',s:10,a:'breathe'},
    ]},
];

// ════════════════════════════════════════════════════════════
// 共通UIコンポーネント
// ════════════════════════════════════════════════════════════
function Btn({ children, onClick, variant='primary', style:sx={}, disabled }) {
  const base = { border:'none', borderRadius:16, padding:'14px 20px', fontSize:16, fontWeight:700,
    cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', transition:'all 0.18s', opacity:disabled?0.5:1, ...sx };
  const v = {
    primary: { background:`linear-gradient(135deg,${T.sage},${T.sageL})`, color:T.white, boxShadow:`0 4px 20px ${T.sage}55` },
    ghost:   { background:'transparent', color:T.inkM, border:`1.5px solid ${T.border}` },
    amber:   { background:`linear-gradient(135deg,${T.amber},#f0bc60)`, color:T.white, boxShadow:`0 4px 20px ${T.amber}55` },
    white:   { background:T.white, color:T.ink, boxShadow:'0 2px 12px rgba(0,0,0,0.1)' },
  };
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ children, style:sx={}, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.white, borderRadius:20, boxShadow:'0 2px 16px rgba(30,42,32,0.07)',
      border:`1px solid ${T.border}`, overflow:'hidden', cursor:onClick?'pointer':'default', ...sx }}>
      {children}
    </div>
  );
}

// ── StepAnim ──────────────────────────────────────────────
function StepAnim({ anim, color, progress }) {
  const sz=120, r=48, circ=2*Math.PI*r, dash=circ*(1-progress);
  const body = {
    breathe:    <div style={{width:sz,height:sz,borderRadius:'50%',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',animation:'breathePulse 4s ease-in-out infinite',border:`3px solid ${color}40`}}><div style={{width:60,height:60,borderRadius:'50%',background:`${color}40`,animation:'breathePulse 4s ease-in-out infinite 0.5s'}}/></div>,
    inhale:     <div style={{width:sz,height:sz,borderRadius:'50%',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',animation:'expandPulse 4s ease-in-out infinite',border:`3px solid ${color}`}}><span style={{fontSize:40}}>⬆️</span></div>,
    exhale:     <div style={{width:sz,height:sz,borderRadius:'50%',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',animation:'contractPulse 4s ease-in-out infinite',border:`3px solid ${color}`}}><span style={{fontSize:40}}>⬇️</span></div>,
    hold:       <div style={{width:sz,height:sz,borderRadius:'50%',background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',border:`3px solid ${color}60`}}><span style={{fontSize:40}}>⏸️</span></div>,
    'tilt-right':<div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:72,animation:'tiltRight 2s ease-in-out infinite'}}>🙆</span></div>,
    'tilt-left': <div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:72,animation:'tiltLeft 2s ease-in-out infinite'}}>🙆</span></div>,
    'tilt-down': <div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:72,animation:'tiltDown 2s ease-in-out infinite'}}>🙇</span></div>,
    'tilt-up':   <div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:72,animation:'floatUp 2s ease-in-out infinite'}}>🧍</span></div>,
    rotate:      <div style={{width:sz,height:sz,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:72,animation:'spinSlow 3s linear infinite'}}>🔄</span></div>,
  };
  return (
    <div style={{position:'relative',width:sz,height:sz,margin:'0 auto'}}>
      <svg width={sz} height={sz} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={6}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          style={{transition:'stroke-dashoffset 0.5s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {body[anim] || body.breathe}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ChallengeRunner
// ════════════════════════════════════════════════════════════
function ChallengeRunner({ challenge, onComplete, onBack }) {
  const [phase, setPhase]   = useState('intro');
  const [cd, setCd]         = useState(3);
  const [si, setSi]         = useState(0);
  const [se, setSe]         = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedRef  = useRef(false);
  const spokenRef  = useRef(false);

  const step  = challenge.steps[si];
  const sp    = step ? Math.min(se / step.s, 1) : 1;
  const totSec = challenge.steps.reduce((a, s) => a + s.s, 0);
  const totEl  = challenge.steps.slice(0, si).reduce((a, s) => a + s.s, 0) + se;
  const totP   = Math.min(totEl / totSec, 1);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (cd === 3 && voiceOn) speak('準備はいいですか？3、2、1、はじめましょう。');
    const t = setTimeout(() => {
      if (cd > 1) setCd(c => c - 1);
      else { setPhase('running'); setSi(0); setSe(0); spokenRef.current = false; }
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, cd]);

  // Running tick
  useEffect(() => {
    if (phase !== 'running' || paused) return;
    if (!spokenRef.current && voiceOn && step) {
      speak(step.t + '。' + step.d);
      spokenRef.current = true;
    }
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setSe(e => {
        const next = e + 0.1;
        if (next >= step.s) {
          const ni = si + 1;
          if (ni >= challenge.steps.length) {
            clearInterval(id);
            setPhase('done');
            if (voiceOn) speak('お疲れさまでした！チャレンジ完了です。');
            return 0;
          }
          setSi(ni); spokenRef.current = false; return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [phase, si, paused, voiceOn]);

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setPaused(p => !p);
    haptic('light');
    if (!pausedRef.current && voiceOn && step) speak(step.d);
  }
  function skipStep() {
    stopSpeak(); spokenRef.current = false;
    haptic('light');
    const ni = si + 1;
    if (ni >= challenge.steps.length) setPhase('done');
    else { setSi(ni); setSe(0); }
  }
  function handleComplete() {
    haptic('success');
    notifyChallengeComplete();
    onComplete();
  }

  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${challenge.colorL},${T.cream} 60%)`,display:'flex',flexDirection:'column',maxWidth:430,margin:'0 auto'}}>
      {/* Header */}
      <div style={{padding:'52px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={() => { stopSpeak(); haptic('light'); onBack(); }}
          style={{background:'rgba(255,255,255,0.85)',border:'none',borderRadius:12,width:40,height:40,fontSize:18,cursor:'pointer'}}>←</button>
        <div style={{textAlign:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:challenge.color,letterSpacing:'0.1em'}}>{challenge.cat}</span>
          <p style={{fontSize:14,fontWeight:700,color:T.ink,margin:0}}>{challenge.title}</p>
        </div>
        <button onClick={() => setVoiceOn(v => !v)}
          style={{background:'rgba(255,255,255,0.85)',border:'none',borderRadius:12,width:40,height:40,fontSize:18,cursor:'pointer',opacity:voiceOn?1:0.4}}>🔊</button>
      </div>

      {/* Total progress bar */}
      <div style={{padding:'0 20px 8px'}}>
        <div style={{background:'rgba(255,255,255,0.4)',borderRadius:99,height:4,overflow:'hidden'}}>
          <div style={{width:`${totP*100}%`,height:'100%',background:challenge.color,borderRadius:99,transition:'width 0.3s'}}/>
        </div>
      </div>

      <div style={{flex:1,padding:'0 20px 24px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>

        {/* INTRO */}
        {phase === 'intro' && (
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:20,animation:'fadeUp 0.4s ease'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:80,marginBottom:12,animation:'float 3s ease-in-out infinite'}}>{challenge.icon}</div>
              <h2 style={{fontSize:26,fontWeight:900,color:T.ink,marginBottom:6,lineHeight:1.3}}>{challenge.title}</h2>
              <p style={{fontSize:13,color:challenge.color,fontWeight:700,marginBottom:14,letterSpacing:'0.06em'}}>{challenge.tagline}</p>
            </div>
            <Card style={{padding:20,background:'rgba(255,255,255,0.9)',border:'none'}}>
              <p style={{fontSize:15,color:T.inkM,lineHeight:1.8,fontFamily:"'Noto Serif JP',serif",margin:'0 0 14px'}}>{challenge.intro}</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[challenge.diff,`⏱ ${challenge.mins}分`,`${challenge.steps.length}ステップ`].map(t =>
                  <span key={t} style={{fontSize:12,background:challenge.colorL,color:challenge.color,padding:'4px 12px',borderRadius:99,fontWeight:700}}>{t}</span>
                )}
              </div>
            </Card>
            <Card style={{padding:'14px 18px',background:'rgba(255,255,255,0.7)',border:'none'}}>
              {challenge.steps.map((s, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<challenge.steps.length-1?8:0}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:`${challenge.color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:challenge.color,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:13,color:T.inkM,flex:1}}>{s.t}</span>
                  <span style={{fontSize:11,color:T.inkL}}>{s.s}秒</span>
                </div>
              ))}
            </Card>
            <Btn onClick={() => { haptic('medium'); setPhase('countdown'); setCd(3); }} variant="amber" style={{width:'100%',padding:18,fontSize:18}}>
              3秒後にスタート 🚀
            </Btn>
          </div>
        )}

        {/* COUNTDOWN */}
        {phase === 'countdown' && (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
            <div style={{width:160,height:160,borderRadius:'50%',background:`linear-gradient(135deg,${challenge.color},${challenge.colorL})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 60px ${challenge.color}60`,animation:'countPop 1s ease'}}>
              <span style={{fontSize:80,fontWeight:900,color:T.white}}>{cd}</span>
            </div>
            <p style={{fontSize:20,fontWeight:700,color:T.ink}}>準備して…</p>
          </div>
        )}

        {/* RUNNING */}
        {phase === 'running' && step && (
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:16,animation:'fadeUp 0.3s ease'}}>
            <div style={{display:'flex',gap:5,justifyContent:'center'}}>
              {challenge.steps.map((_, i) =>
                <div key={i} style={{height:4,flex:1,borderRadius:99,background:i<=si?challenge.color:`${challenge.color}25`,opacity:i===si?1:i<si?0.5:0.25,transition:'all 0.3s'}}/>
              )}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
              <StepAnim anim={step.a} color={challenge.color} progress={sp}/>
              <div style={{background:challenge.colorL,borderRadius:99,padding:'6px 20px'}}>
                <span style={{fontSize:20,fontWeight:900,color:challenge.color}}>{Math.max(0,Math.ceil(step.s-se))}秒</span>
              </div>
            </div>
            <Card style={{padding:'18px 22px',background:'rgba(255,255,255,0.96)',border:'none',flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:challenge.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:T.white,fontWeight:700,flexShrink:0}}>{si+1}</div>
                <h3 style={{fontSize:20,fontWeight:900,color:T.ink,margin:0}}>{step.t}</h3>
              </div>
              <p style={{fontSize:16,color:T.inkM,lineHeight:1.8,fontFamily:"'Noto Serif JP',serif",margin:0}}>{step.d}</p>
            </Card>
            <div style={{display:'flex',gap:10}}>
              <button onClick={togglePause} style={{flex:1,padding:14,borderRadius:16,fontSize:17,border:`2px solid ${T.border}`,background:T.white,cursor:'pointer',fontWeight:700,color:T.inkM}}>
                {paused ? '▶️ 再開' : '⏸️ 一時停止'}
              </button>
              <button onClick={skipStep} style={{padding:'14px 18px',borderRadius:16,fontSize:14,border:`2px solid ${T.border}`,background:T.white,cursor:'pointer',color:T.inkL}}>スキップ →</button>
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:22,animation:'fadeUp 0.5s ease'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:80,animation:'float 2s ease-in-out infinite'}}>🌱</div>
              <h2 style={{fontSize:28,fontWeight:900,color:T.ink,margin:'14px 0 8px'}}>完了！</h2>
              <p style={{fontSize:16,color:T.inkM,fontFamily:"'Noto Serif JP',serif",lineHeight:1.7}}>{challenge.title}を<br/>やり遂げました。</p>
            </div>
            <div style={{background:challenge.colorL,borderRadius:20,padding:'14px 28px',textAlign:'center'}}>
              <p style={{fontSize:12,color:challenge.color,fontWeight:700,margin:'0 0 2px'}}>消費時間</p>
              <p style={{fontSize:24,fontWeight:900,color:challenge.color,margin:0}}>{challenge.mins}分</p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%'}}>
              <Btn onClick={handleComplete} variant="primary" style={{width:'100%',padding:16}}>✅ 達成を記録する</Btn>
              <Btn onClick={() => { setPhase('intro'); setSi(0); setSe(0); stopSpeak(); }} variant="ghost" style={{width:'100%'}}>もう一度やる</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ChallengePicker
// ════════════════════════════════════════════════════════════
function ChallengePicker({ onSelect, onBack }) {
  const cats = ['全て','体','心','仕事','家','つながり'];
  const [filter, setFilter] = useState('全て');
  const filtered = filter === '全て' ? CHALLENGES : CHALLENGES.filter(c => c.cat === filter);

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 16px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:T.sageXL,border:'none',borderRadius:12,width:40,height:40,fontSize:18,cursor:'pointer'}}>←</button>
        <div>
          <h2 style={{fontSize:20,fontWeight:900,color:T.ink}}>チャレンジを選ぶ</h2>
          <p style={{fontSize:12,color:T.inkL,margin:0}}>{CHALLENGES.length}種類のガイド付きチャレンジ</p>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:4}}>
        {cats.map(c =>
          <button key={c} onClick={() => setFilter(c)}
            style={{flexShrink:0,padding:'8px 16px',borderRadius:99,fontSize:13,fontWeight:filter===c?'700':'400',
              border:filter===c?`2px solid ${T.sage}`:`2px solid ${T.border}`,
              background:filter===c?T.sageXL:'transparent',color:filter===c?T.sage:T.inkL,cursor:'pointer',fontFamily:'inherit'}}>{c}</button>
        )}
      </div>
      {filtered.map(ch => (
        <Card key={ch.id} style={{marginBottom:12,cursor:'pointer'}} onClick={() => { haptic('light'); onSelect(ch); }}>
          <div style={{background:`linear-gradient(135deg,${ch.colorL},${T.cream})`,padding:'16px 18px',display:'flex',gap:14,alignItems:'center'}}>
            <span style={{fontSize:38,flexShrink:0}}>{ch.icon}</span>
            <div style={{flex:1}}>
              <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontSize:11,fontWeight:700,color:ch.color,background:`${ch.color}18`,padding:'2px 8px',borderRadius:99}}>{ch.cat}</span>
                <span style={{fontSize:11,color:T.inkL,background:T.sand,padding:'2px 8px',borderRadius:99}}>{ch.diff}</span>
                <span style={{fontSize:11,color:T.inkL,background:T.sand,padding:'2px 8px',borderRadius:99}}>⏱{ch.mins}分</span>
              </div>
              <p style={{fontSize:15,fontWeight:700,color:T.ink,margin:'0 0 2px'}}>{ch.title}</p>
              <p style={{fontSize:12,color:T.inkL,margin:0}}>{ch.tagline}</p>
            </div>
            <span style={{fontSize:20,color:T.inkL}}>›</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HomeScreen
// ════════════════════════════════════════════════════════════
const WEEK_DATA = [
  {day:'月',date:10,status:'done'},{day:'火',date:11,status:'done'},
  {day:'水',date:12,status:'skip'},{day:'木',date:13,status:'done'},
  {day:'金',date:14,status:'done'},{day:'土',date:15,status:null},{day:'日',date:16,status:null},
];
const SAMPLE_POSTS = [
  {id:1,emoji:'🌿',text:'首のストレッチ、音声ガイドがあったから最後まできた。',likes:34,time:'2時間前'},
  {id:2,emoji:'☀️',text:'ボックス呼吸、仕事前にやったら本当に落ち着いた。',likes:28,time:'5時間前'},
  {id:3,emoji:'🌙',text:'今日はスキップした。でもスキップを押せた自分を褒めたい。',likes:61,time:'昨日'},
];

function HomeScreen({ onStart, onPick, onGoBoard, todayDone, streak }) {
  const tc = getTodayChallenge();
  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <p style={{fontSize:13,color:T.inkL,marginBottom:4,letterSpacing:'0.06em'}}>今日も</p>
        <h1 style={{fontSize:28,fontWeight:900,color:T.ink,lineHeight:1.2}}>ひとあし、<br/>踏み出そう。</h1>
        {streak > 0 &&
          <div style={{marginTop:12,display:'inline-flex',alignItems:'center',gap:6,background:T.amberL,borderRadius:99,padding:'6px 14px'}}>
            <span style={{fontSize:16}}>🔥</span>
            <span style={{fontSize:14,fontWeight:700,color:T.amber}}>{streak}日連続</span>
          </div>
        }
      </div>

      {/* Today's CTA */}
      <div style={{background:`linear-gradient(135deg,${tc.color},${tc.color}99)`,borderRadius:24,padding:'22px 22px 18px',marginBottom:16,boxShadow:`0 8px 32px ${tc.color}44`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div style={{flex:1}}>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'0.12em'}}>TODAY</span>
            <h2 style={{fontSize:22,fontWeight:900,color:T.white,margin:'4px 0 4px',lineHeight:1.3}}>{tc.title}</h2>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.85)',margin:0}}>{tc.tagline}</p>
          </div>
          <span style={{fontSize:50,lineHeight:1,flexShrink:0,marginLeft:12}}>{tc.icon}</span>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {[tc.diff,`⏱ ${tc.mins}分`,`${tc.steps.length}ステップ`,'🔊 音声ガイド付き'].map(t =>
            <span key={t} style={{fontSize:11,background:'rgba(255,255,255,0.25)',color:T.white,padding:'4px 10px',borderRadius:99,fontWeight:600}}>{t}</span>
          )}
        </div>
        {!todayDone ? (
          <button onClick={() => { haptic('medium'); onStart(tc); }}
            style={{width:'100%',padding:16,borderRadius:16,background:T.white,border:'none',fontSize:16,fontWeight:900,color:tc.color,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 16px rgba(0,0,0,0.15)'}}>
            <span style={{fontSize:20}}>▶️</span> 今すぐはじめる（3秒後スタート）
          </button>
        ) : (
          <div style={{background:'rgba(255,255,255,0.25)',borderRadius:16,padding:'14px 20px',textAlign:'center'}}>
            <span style={{fontSize:16,fontWeight:700,color:T.white}}>🌱 今日は完了！お疲れさまでした</span>
          </div>
        )}
      </div>

      {/* Other challenges */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <p style={{fontSize:14,fontWeight:700,color:T.ink}}>他のチャレンジ（{CHALLENGES.length}種）</p>
        <button onClick={onPick} style={{background:'none',border:'none',fontSize:13,color:T.sage,cursor:'pointer',fontWeight:700}}>すべて見る →</button>
      </div>
      <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8,marginBottom:16}}>
        {CHALLENGES.filter(c => c.id !== tc.id).slice(0,5).map(ch => (
          <button key={ch.id} onClick={() => { haptic('light'); onStart(ch); }}
            style={{flexShrink:0,width:130,padding:14,borderRadius:18,background:T.white,border:`1px solid ${T.border}`,cursor:'pointer',textAlign:'left',boxShadow:'0 2px 12px rgba(0,0,0,0.05)'}}>
            <span style={{fontSize:30,display:'block',marginBottom:6}}>{ch.icon}</span>
            <p style={{fontSize:13,fontWeight:700,color:T.ink,margin:'0 0 2px',lineHeight:1.3}}>{ch.title}</p>
            <span style={{fontSize:11,color:ch.color,fontWeight:700}}>{ch.mins}分</span>
          </button>
        ))}
      </div>

      {/* Week record */}
      <Card style={{marginBottom:16,padding:'18px 20px'}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:12}}>今週の記録</p>
        <div style={{display:'flex',gap:6,justifyContent:'space-between'}}>
          {WEEK_DATA.map(d => (
            <div key={d.day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <span style={{fontSize:11,color:T.inkL}}>{d.day}</span>
              <div style={{width:34,height:34,borderRadius:9,background:d.status==='done'?T.sage:d.status==='skip'?T.sageXL:T.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:d.status==='done'?T.white:T.inkL}}>
                {d.status==='done'?'✓':d.status==='skip'?'–':''}
              </div>
              <span style={{fontSize:11,color:T.inkL}}>{d.date}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Board teaser */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <p style={{fontSize:14,fontWeight:700,color:T.ink}}>みんなの声 ✨</p>
        <button onClick={onGoBoard} style={{background:'none',border:'none',fontSize:13,color:T.sage,cursor:'pointer',fontWeight:700}}>すべて見る →</button>
      </div>
      {SAMPLE_POSTS.map(p => (
        <Card key={p.id} style={{marginBottom:10,padding:16}}>
          <div style={{display:'flex',gap:10}}>
            <span style={{fontSize:26,flexShrink:0}}>{p.emoji}</span>
            <div>
              <p style={{fontSize:14,color:T.inkM,lineHeight:1.6,margin:'0 0 6px',fontFamily:"'Noto Serif JP',serif"}}>{p.text}</p>
              <span style={{fontSize:12,color:T.inkL}}>❤️ {p.likes}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── BoardScreen ───────────────────────────────────────────
function BoardScreen() {
  const [posts, setPosts]       = useState(SAMPLE_POSTS);
  const [text, setText]         = useState('');
  const [likedIds, setLikedIds] = useState([]);
  const [focused, setFocused]   = useState(false);
  const [sugs, setSugs]         = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const fetched = useRef(false);
  const taRef   = useRef(null);

  useEffect(() => {
    if (focused && !fetched.current) {
      fetched.current = true; setSugLoading(true); setSugs([]);
      callClaude('習慣アプリ掲示板の書き出し候補3つをJSON配列のみで返して: ["候補1","候補2","候補3"]')
        .then(r => { try { setSugs(JSON.parse(r.replace(/```json|```/g,'').trim())); } catch { setSugs(['今日のチャレンジ、やってみました。','正直きつかったけど少し前進した。','小さな一歩でも確かに踏み出した。']); } })
        .catch(() => setSugs(['今日のチャレンジ、やってみました。','正直きつかったけど少し前進した。','小さな一歩でも確かに踏み出した。']))
        .finally(() => setSugLoading(false));
    }
    if (!focused) fetched.current = false;
  }, [focused]);

  async function post() {
    if (!text.trim()) return;
    haptic('medium');
    const emojis = ['🌿','☀️','🌙','🍃','✨'];
    let ac = '';
    try { ac = await callClaude(`投稿:「${text}」\n温かい一言コメント（1文）を日本語で。`); } catch {}
    setPosts([{ id:Date.now(), emoji:emojis[Math.floor(Math.random()*5)], text, likes:0, time:'今', aiComment:ac }, ...posts]);
    setText(''); setFocused(false);
  }

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 18px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>みんなのストーリー 💬</h2>
        <p style={{fontSize:13,color:T.inkL,marginTop:4}}>匿名で、素直な気持ちを共有しよう</p>
      </div>
      <Card style={{marginBottom:16,padding:'18px 20px'}}>
        <div style={{position:'relative'}}>
          <textarea ref={taRef} value={text} onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="タップするとAIが候補を提案…" rows={focused?3:2}
            style={{width:'100%',border:`1.5px solid ${focused?T.sage:T.border}`,borderRadius:12,padding:'12px 14px',fontSize:14,fontFamily:"'Noto Serif JP',serif",resize:'none',color:T.inkM,background:T.cream,lineHeight:1.7,transition:'all 0.2s',boxShadow:focused?`0 0 0 3px ${T.sageXL}`:'none'}}/>
          {!focused && <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:T.sageXL,color:T.sage,fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:99,pointerEvents:'none'}}>AI ✨</div>}
        </div>
        {focused && (
          <div style={{marginTop:10}}>
            {sugLoading && [0,1,2].map(i =>
              <div key={i} style={{height:44,borderRadius:12,marginBottom:8,background:`linear-gradient(90deg,${T.sageXL} 25%,#d8eed8 50%,${T.sageXL} 75%)`,backgroundSize:'200% 100%',animation:`shimmer 1.4s ${i*0.15}s infinite`}}/>
            )}
            {!sugLoading && sugs.map((s,i) =>
              <button key={i} onClick={() => { setText(s); taRef.current?.focus(); }}
                style={{width:'100%',textAlign:'left',padding:'10px 14px',borderRadius:12,border:`1.5px solid ${T.sageXL}`,background:T.cream,cursor:'pointer',fontFamily:'inherit',marginBottom:8,fontSize:13,color:T.inkM,lineHeight:1.6}}>
                {['🌿','☀️','🌙'][i]} {s}
              </button>
            )}
            <Btn onClick={post} variant="primary" style={{width:'100%',marginTop:4}} disabled={!text.trim()}>📝 匿名で投稿する</Btn>
          </div>
        )}
      </Card>
      {posts.map(p => (
        <Card key={p.id} style={{marginBottom:12,padding:18}}>
          <div style={{display:'flex',gap:12}}>
            <span style={{fontSize:30,flexShrink:0}}>{p.emoji}</span>
            <div style={{flex:1}}>
              <p style={{fontSize:14,color:T.inkM,lineHeight:1.7,margin:'0 0 8px',fontFamily:"'Noto Serif JP',serif"}}>{p.text}</p>
              {p.aiComment && <div style={{background:T.sageXL,borderRadius:10,padding:'8px 12px',marginBottom:8}}><p style={{fontSize:13,color:T.sage,margin:0}}>🌿 {p.aiComment}</p></div>}
              <div style={{display:'flex',gap:14,alignItems:'center'}}>
                <button onClick={() => {
                  haptic('light');
                  const liked = likedIds.includes(p.id);
                  setLikedIds(liked ? likedIds.filter(i => i !== p.id) : [...likedIds, p.id]);
                  setPosts(posts.map(x => x.id===p.id ? {...x,likes:x.likes+(liked?-1:1)} : x));
                }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:likedIds.includes(p.id)?T.rose:T.inkL,fontWeight:likedIds.includes(p.id)?'700':'400',fontFamily:'inherit'}}>
                  {likedIds.includes(p.id)?'❤️':'🤍'} {p.likes}
                </button>
                <span style={{fontSize:12,color:T.inkL,marginLeft:'auto'}}>{p.time}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── BottomNav ─────────────────────────────────────────────
const NAV = [
  {id:'home',icon:'🏠',label:'ホーム'},
  {id:'board',icon:'💬',label:'掲示板'},
  {id:'goals',icon:'🎯',label:'目標'},
  {id:'dash',icon:'📊',label:'記録'},
  {id:'notif',icon:'🔔',label:'通知'},
];
function BottomNav({ current, onChange, unread }) {
  return (
    <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:'rgba(250,247,242,0.96)',backdropFilter:'blur(16px)',borderTop:`1px solid ${T.border}`,display:'flex',zIndex:100,paddingBottom:'env(safe-area-inset-bottom)'}}>
      {NAV.map(n => (
        <button key={n.id} onClick={() => { haptic('light'); onChange(n.id); }}
          style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0 12px',background:'none',border:'none',cursor:'pointer',position:'relative',gap:3}}>
          <span style={{fontSize:22,filter:current===n.id?'none':'grayscale(0.6) opacity(0.55)'}}>{n.icon}</span>
          <span style={{fontSize:10,fontWeight:current===n.id?'700':'400',color:current===n.id?T.sage:T.inkL}}>{n.label}</span>
          {n.id==='notif' && unread>0 &&
            <span style={{position:'absolute',top:6,right:18,background:T.rose,color:'#fff',fontSize:9,fontWeight:700,borderRadius:99,minWidth:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{unread}</span>
          }
          {current===n.id && <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:24,height:3,background:T.sage,borderRadius:'99px 99px 0 0'}}/>}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 目標設定画面
// ════════════════════════════════════════════════════════════
const GOAL_TEMPLATES = [
  { id:'health',  icon:'💪', label:'体を動かす',   desc:'毎日ストレッチや運動の習慣をつける' },
  { id:'mind',    icon:'🧘', label:'心を整える',   desc:'呼吸法や瞑想で気持ちを落ち着かせる' },
  { id:'work',    icon:'📚', label:'集中力を上げる', desc:'ポモドーロや片付けで生産性を高める' },
  { id:'home',    icon:'🏠', label:'家を整える',   desc:'毎日少しずつ片付けて快適な空間に' },
  { id:'connect', icon:'💌', label:'つながりを大切に', desc:'感謝を伝えたり人と深くつながる' },
  { id:'custom',  icon:'✨', label:'自分で決める',  desc:'オリジナルの目標を設定する' },
];

function GoalsScreen() {
  const [goals, setGoals]         = useState([]);
  const [adding, setAdding]       = useState(false);
  const [customText, setCustomText] = useState('');
  const [freq, setFreq]           = useState(5); // 週N回
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [aiTip, setAiTip]         = useState('');
  const [tipLoading, setTipLoading] = useState(false);

  useEffect(() => {
    sget('goals').then(v => { if (v) setGoals(v); });
  }, []);

  async function saveGoals(next) {
    setGoals(next);
    await sset('goals', next);
  }

  async function addGoal() {
    if (!selectedTemplate) return;
    const label = selectedTemplate.id === 'custom'
      ? customText.trim()
      : selectedTemplate.label;
    if (!label) return;
    const goal = {
      id: Date.now(),
      icon: selectedTemplate.icon,
      label,
      freq,
      doneThisWeek: 0,
      createdAt: todayKey(),
    };
    const next = [...goals, goal];
    await saveGoals(next);
    setAdding(false); setSelectedTemplate(null); setCustomText(''); setFreq(5);
    haptic('success');
  }

  async function removeGoal(id) {
    haptic('light');
    await saveGoals(goals.filter(g => g.id !== id));
  }

  async function getAiTip() {
    if (!goals.length) return;
    setTipLoading(true); setAiTip('');
    const labels = goals.map(g => g.label).join('、');
    const tip = await callClaude(`習慣目標：「${labels}」\nこれらを続けるための具体的なコツを1つ、2文以内で日本語で教えてください。`);
    setAiTip(tip); setTipLoading(false);
  }

  const doneCount = goals.reduce((a, g) => a + g.doneThisWeek, 0);
  const totalTarget = goals.reduce((a, g) => a + g.freq, 0);

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>目標設定 🎯</h2>
        <p style={{fontSize:13,color:T.inkL,marginTop:4}}>続けたいことを決めて、習慣にしよう</p>
      </div>

      {/* 今週の進捗サマリー */}
      {goals.length > 0 && (
        <Card style={{marginBottom:16,padding:'18px 20px'}}>
          <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:10}}>今週の進捗</p>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{flex:1}}>
              <div style={{background:T.border,borderRadius:99,height:8,overflow:'hidden'}}>
                <div style={{width:totalTarget?`${Math.min(doneCount/totalTarget*100,100)}%`:'0%',height:'100%',background:`linear-gradient(90deg,${T.sage},${T.sageL})`,borderRadius:99,transition:'width 0.5s'}}/>
              </div>
            </div>
            <span style={{fontSize:15,fontWeight:700,color:T.sage,flexShrink:0}}>{doneCount}/{totalTarget}回</span>
          </div>
        </Card>
      )}

      {/* 目標リスト */}
      {goals.map(g => (
        <Card key={g.id} style={{marginBottom:12,padding:'16px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:32,flexShrink:0}}>{g.icon}</span>
            <div style={{flex:1}}>
              <p style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:4}}>{g.label}</p>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:12,color:T.inkL}}>週{g.freq}回目標</span>
                <span style={{fontSize:12,color:T.sage,fontWeight:700}}>・今週{g.doneThisWeek}回達成</span>
              </div>
              {/* ドット進捗 */}
              <div style={{display:'flex',gap:4,marginTop:8}}>
                {Array.from({length:g.freq}).map((_,i) => (
                  <div key={i} onClick={async () => {
                    haptic('light');
                    const next = goals.map(x => x.id===g.id ? {...x, doneThisWeek: i < x.doneThisWeek ? i : Math.min(i+1, x.freq)} : x);
                    await saveGoals(next);
                  }} style={{width:20,height:20,borderRadius:'50%',background:i<g.doneThisWeek?T.sage:T.sageXL,cursor:'pointer',transition:'all 0.2s',border:`2px solid ${i<g.doneThisWeek?T.sage:T.border}`}}/>
                ))}
              </div>
            </div>
            <button onClick={() => removeGoal(g.id)}
              style={{background:'none',border:'none',color:T.inkL,fontSize:18,cursor:'pointer',padding:4}}>×</button>
          </div>
        </Card>
      ))}

      {/* AIアドバイス */}
      {goals.length > 0 && (
        <button onClick={getAiTip} disabled={tipLoading}
          style={{width:'100%',padding:'12px 16px',borderRadius:14,border:`1.5px dashed ${T.sage}`,background:'transparent',cursor:'pointer',marginBottom:12,fontFamily:'inherit',color:T.sage,fontWeight:700,fontSize:14}}>
          {tipLoading ? '考え中...' : '✨ AIにアドバイスをもらう'}
        </button>
      )}
      {aiTip && (
        <Card style={{marginBottom:16,padding:'14px 18px',background:T.sageXL,border:'none'}}>
          <p style={{fontSize:14,color:T.sage,lineHeight:1.7,fontFamily:"'Noto Serif JP',serif",margin:0}}>🌿 {aiTip}</p>
        </Card>
      )}

      {/* 目標追加 */}
      {!adding ? (
        <button onClick={() => { haptic('light'); setAdding(true); }}
          style={{width:'100%',padding:16,borderRadius:16,border:`2px dashed ${T.border}`,background:'transparent',cursor:'pointer',fontSize:15,color:T.inkM,fontFamily:'inherit',fontWeight:700}}>
          ＋ 目標を追加する
        </button>
      ) : (
        <Card style={{padding:'18px 20px'}}>
          <p style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:14}}>どんな習慣を作りたい？</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
            {GOAL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelectedTemplate(t)}
                style={{padding:'12px 10px',borderRadius:14,border:`2px solid ${selectedTemplate?.id===t.id?T.sage:T.border}`,background:selectedTemplate?.id===t.id?T.sageXL:'transparent',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}>
                <span style={{fontSize:22,display:'block',marginBottom:4}}>{t.icon}</span>
                <p style={{fontSize:13,fontWeight:700,color:T.ink,margin:'0 0 2px'}}>{t.label}</p>
                <p style={{fontSize:11,color:T.inkL,margin:0,lineHeight:1.4}}>{t.desc}</p>
              </button>
            ))}
          </div>
          {selectedTemplate?.id === 'custom' && (
            <input value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder="目標を入力（例：毎日水を2L飲む）"
              style={{width:'100%',padding:'10px 14px',borderRadius:12,border:`1.5px solid ${T.border}`,fontSize:14,fontFamily:'inherit',color:T.ink,background:T.cream,marginBottom:12}}/>
          )}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:13,color:T.inkM,marginBottom:8}}>週に何回やる？</p>
            <div style={{display:'flex',gap:6}}>
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => setFreq(n)}
                  style={{width:36,height:36,borderRadius:'50%',border:`2px solid ${freq===n?T.sage:T.border}`,background:freq===n?T.sage:'transparent',color:freq===n?T.white:T.inkM,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <Btn onClick={() => { setAdding(false); setSelectedTemplate(null); }} variant="ghost" style={{flex:1}}>キャンセル</Btn>
            <Btn onClick={addGoal} variant="primary" style={{flex:1}} disabled={!selectedTemplate || (selectedTemplate.id==='custom' && !customText.trim())}>追加する</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 成長の記録画面
// ════════════════════════════════════════════════════════════
function DashScreen({ streak, history }) {
  const [tab, setTab] = useState('week');

  // 過去30日分のダミーデータ（実際はhistoryから生成）
  const last30 = Array.from({length:30}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (29-i));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const done = history?.[key] || (Math.random() > 0.35);
    return { date:d, key, done, day:d.getDate(), month:d.getMonth()+1 };
  });

  const totalDone  = last30.filter(d => d.done).length;
  const thisWeek   = last30.slice(-7);
  const weekDone   = thisWeek.filter(d => d.done).length;
  const longestRun = last30.reduce((acc, d) => {
    if (d.done) { acc.cur++; acc.max = Math.max(acc.max, acc.cur); }
    else acc.cur = 0;
    return acc;
  }, {cur:0,max:0}).max;

  const DAYS = ['月','火','水','木','金','土','日'];

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>成長の記録 📊</h2>
        <p style={{fontSize:13,color:T.inkL,marginTop:4}}>続けてきた自分を振り返ろう</p>
      </div>

      {/* ストリーク大表示 */}
      <div style={{background:`linear-gradient(135deg,${T.amber},#f0bc60)`,borderRadius:24,padding:'24px 24px 20px',marginBottom:16,boxShadow:`0 8px 32px ${T.amber}44`,textAlign:'center'}}>
        <p style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'0.12em',marginBottom:8}}>現在の連続記録</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
          <span style={{fontSize:56}}>🔥</span>
          <span style={{fontSize:72,fontWeight:900,color:T.white,lineHeight:1}}>{streak}</span>
          <span style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,0.9)'}}>日</span>
        </div>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:8}}>最長記録：{longestRun}日</p>
      </div>

      {/* サマリーカード */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {label:'今週の達成',value:`${weekDone}/7日`,icon:'📅',color:T.sage},
          {label:'今月の達成',value:`${totalDone}日`,icon:'📆',color:T.purple},
          {label:'達成率',value:`${Math.round(totalDone/30*100)}%`,icon:'✨',color:T.teal},
          {label:'お気に入り',value:'呼吸法',icon:'❤️',color:T.rose},
        ].map(s => (
          <Card key={s.label} style={{padding:'14px 16px'}}>
            <span style={{fontSize:22,display:'block',marginBottom:6}}>{s.icon}</span>
            <p style={{fontSize:20,fontWeight:900,color:s.color,margin:'0 0 2px'}}>{s.value}</p>
            <p style={{fontSize:11,color:T.inkL,margin:0}}>{s.label}</p>
          </Card>
        ))}
      </div>

      {/* カレンダービュー */}
      <Card style={{padding:'18px 20px',marginBottom:16}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:12}}>過去30日</p>
        <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
          {last30.map((d,i) => (
            <div key={i} title={`${d.month}/${d.day}`}
              style={{width:32,height:32,borderRadius:8,background:d.done?T.sage:T.sageXL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:d.done?T.white:T.inkL,fontWeight:d.done?700:400,margin:1}}>
              {d.day}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
          <div style={{width:12,height:12,borderRadius:3,background:T.sage}}/>
          <span style={{fontSize:11,color:T.inkL}}>達成</span>
          <div style={{width:12,height:12,borderRadius:3,background:T.sageXL,marginLeft:8}}/>
          <span style={{fontSize:11,color:T.inkL}}>未達成</span>
        </div>
      </Card>

      {/* 今週の棒グラフ */}
      <Card style={{padding:'18px 20px'}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:16}}>今週のチャレンジ数</p>
        <div style={{display:'flex',gap:6,alignItems:'flex-end',height:80}}>
          {thisWeek.map((d,i) => {
            const h = d.done ? Math.floor(Math.random()*40)+40 : Math.floor(Math.random()*20)+5;
            return (
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <div style={{width:'100%',height:h,borderRadius:'6px 6px 0 0',background:d.done?`linear-gradient(180deg,${T.sageL},${T.sage})`:T.sageXL,transition:'height 0.5s'}}/>
                <span style={{fontSize:10,color:T.inkL}}>{DAYS[i]}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 通知設定画面
// ════════════════════════════════════════════════════════════
function NotifScreen() {
  const [notifOn, setNotifOn]       = useState(true);
  const [hour, setHour]             = useState(8);
  const [minute, setMinute]         = useState(0);
  const [saved, setSaved]           = useState(false);
  const [isDirty, setIsDirty]       = useState(false);
  // 保存済みの設定を別途保持して「現在の設定」表示に使う
  const [savedSettings, setSavedSettings] = useState(null);

  useEffect(() => {
    sget('notif-settings').then(v => {
      if (v) {
        setNotifOn(v.on);
        setHour(v.hour);
        setMinute(v.minute);
        setSavedSettings(v);
      } else {
        // デフォルト値を「保存済み」として扱う
        setSavedSettings({ on: true, hour: 8, minute: 0 });
      }
    });
  }, []);

  // 設定が変更されたら「未保存」フラグを立てる
  useEffect(() => {
    if (!savedSettings) return;
    const changed = notifOn !== savedSettings.on ||
                    hour    !== savedSettings.hour ||
                    minute  !== savedSettings.minute;
    setIsDirty(changed);
  }, [notifOn, hour, minute, savedSettings]);

  async function save() {
    haptic('success');
    const settings = { on: notifOn, hour, minute };
    await sset('notif-settings', settings);
    if (notifOn) {
      scheduleNotification(hour, '🌱 今日のひとあし', `${hour}時です。今日の小さなチャレンジを始めませんか？`);
    } else {
      // ネイティブ側の通知もキャンセル
      if (isNative && window.nativeApp?.cancelNotification) {
        window.nativeApp.cancelNotification();
      }
    }
    setSavedSettings(settings);
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const timeStr = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  const savedTimeStr = savedSettings
    ? `${String(savedSettings.hour).padStart(2,'0')}:${String(savedSettings.minute).padStart(2,'0')}`
    : '08:00';

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>通知設定 🔔</h2>
        <p style={{fontSize:13,color:T.inkL,marginTop:4}}>毎日のリマインダーを設定しよう</p>
      </div>

      {/* ── 現在の設定バナー ── */}
      <div style={{
        background: savedSettings?.on
          ? `linear-gradient(135deg,${T.sage},${T.sageL})`
          : T.sand,
        borderRadius: 16,
        padding: '14px 18px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <span style={{fontSize: 28, flexShrink: 0}}>
          {savedSettings?.on ? '🔔' : '🔕'}
        </span>
        <div style={{flex: 1}}>
          <p style={{fontSize: 11, fontWeight: 700,
            color: savedSettings?.on ? 'rgba(255,255,255,0.75)' : T.inkL,
            letterSpacing: '0.08em', marginBottom: 2}}>
            現在の設定
          </p>
          {savedSettings?.on ? (
            <p style={{fontSize: 17, fontWeight: 900, color: '#fff', margin: 0}}>
              毎日 {savedTimeStr} に通知
            </p>
          ) : (
            <p style={{fontSize: 15, fontWeight: 700, color: T.inkM, margin: 0}}>
              通知オフ
            </p>
          )}
        </div>
        {/* 未保存バッジ */}
        {isDirty && (
          <span style={{background:'rgba(255,255,255,0.25)',color: savedSettings?.on?'#fff':T.inkM,
            fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,flexShrink:0}}>
            未保存
          </span>
        )}
      </div>

      {/* ── ON/OFF ── */}
      <Card style={{marginBottom:12,padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:15,fontWeight:700,color:T.ink,marginBottom:2}}>毎日リマインダー</p>
            <p style={{fontSize:12,color:T.inkL}}>設定した時間にお知らせします</p>
          </div>
          <button onClick={() => { haptic('light'); setNotifOn(v => !v); }}
            style={{width:50,height:28,borderRadius:99,background:notifOn?T.sage:T.border,border:'none',cursor:'pointer',position:'relative',transition:'all 0.2s'}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:T.white,position:'absolute',top:3,left:notifOn?25:3,transition:'all 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
          </button>
        </div>
      </Card>

      {/* ── 時刻設定 ── */}
      {notifOn && (
        <Card style={{marginBottom:12,padding:'20px'}}>
          <p style={{fontSize:13,fontWeight:700,color:T.inkL,letterSpacing:'0.08em',marginBottom:16}}>通知時刻</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:20}}>
            {/* 時 */}
            <div style={{textAlign:'center'}}>
              <button onClick={() => setHour(h => (h+1)%24)} style={{display:'block',width:56,padding:'8px 0',background:T.sageXL,border:'none',borderRadius:10,fontSize:18,cursor:'pointer',marginBottom:6}}>▲</button>
              <div style={{width:56,padding:'10px 0',background:T.white,border:`2px solid ${T.sage}`,borderRadius:12,fontSize:28,fontWeight:900,color:T.ink,textAlign:'center'}}>{String(hour).padStart(2,'0')}</div>
              <button onClick={() => setHour(h => (h+23)%24)} style={{display:'block',width:56,padding:'8px 0',background:T.sageXL,border:'none',borderRadius:10,fontSize:18,cursor:'pointer',marginTop:6}}>▼</button>
            </div>
            <span style={{fontSize:32,fontWeight:900,color:T.ink,marginBottom:4}}>:</span>
            {/* 分 */}
            <div style={{textAlign:'center'}}>
              <button onClick={() => setMinute(m => (m+15)%60)} style={{display:'block',width:56,padding:'8px 0',background:T.sageXL,border:'none',borderRadius:10,fontSize:18,cursor:'pointer',marginBottom:6}}>▲</button>
              <div style={{width:56,padding:'10px 0',background:T.white,border:`2px solid ${T.sage}`,borderRadius:12,fontSize:28,fontWeight:900,color:T.ink,textAlign:'center'}}>{String(minute).padStart(2,'0')}</div>
              <button onClick={() => setMinute(m => (m+45)%60)} style={{display:'block',width:56,padding:'8px 0',background:T.sageXL,border:'none',borderRadius:10,fontSize:18,cursor:'pointer',marginTop:6}}>▼</button>
            </div>
          </div>
          {/* クイック選択 */}
          <p style={{fontSize:12,color:T.inkL,marginBottom:10}}>よく使う時間</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[[6,0,'早朝'],[7,0,'朝'],[8,0,'朝'],[12,0,'昼'],[18,0,'夕方'],[21,0,'夜']].map(([h,m,label]) => (
              <button key={h} onClick={() => { setHour(h); setMinute(m); haptic('light'); }}
                style={{padding:'6px 14px',borderRadius:99,border:`1.5px solid ${hour===h&&minute===m?T.sage:T.border}`,background:hour===h&&minute===m?T.sageXL:'transparent',fontSize:13,color:hour===h&&minute===m?T.sage:T.inkM,cursor:'pointer',fontFamily:'inherit',fontWeight:hour===h&&minute===m?700:400}}>
                {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')} {label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── 通知プレビュー ── */}
      {notifOn && (
        <Card style={{marginBottom:16,padding:'14px 18px',background:T.sageXL,border:'none'}}>
          <p style={{fontSize:11,fontWeight:700,color:T.sage,marginBottom:6,letterSpacing:'0.08em'}}>
            保存後の通知イメージ
          </p>
          <div style={{background:T.white,borderRadius:12,padding:'10px 14px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <p style={{fontSize:12,color:T.inkL,marginBottom:2}}>{timeStr}</p>
            <p style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:2}}>🌱 今日のひとあし</p>
            <p style={{fontSize:12,color:T.inkM}}>{hour}時です。今日の小さなチャレンジを始めませんか？</p>
          </div>
        </Card>
      )}

      {/* ── 保存ボタン ── */}
      <Btn onClick={save} variant={isDirty ? 'amber' : 'primary'} style={{width:'100%',padding:16,fontSize:16}}>
        {saved   ? '✅ 保存しました！' :
         isDirty ? '💾 変更を保存する' :
                   '✅ 保存済み'}
      </Btn>

      {!notifOn && (
        <p style={{fontSize:12,color:T.inkL,textAlign:'center',marginTop:12}}>
          通知をオフにしても、アプリを開けばいつでもチャレンジできます
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// オンボーディング
// ════════════════════════════════════════════════════════════
const ONBOARDING_SLIDES = [
  {
    icon:'🌱',
    bg:`linear-gradient(160deg,#c6f0d4,#e8f4ec)`,
    title:'ひとあし、へようこそ',
    desc:'完璧じゃなくていい。\n今日できる小さな一歩を、一緒に踏み出しましょう。',
  },
  {
    icon:'⏱️',
    bg:`linear-gradient(160deg,#fef3c7,#fdf0d5)`,
    title:'1〜5分でできる\n25種のチャレンジ',
    desc:'体・心・仕事・家・つながり。\n音声ガイド付きで、迷わず動ける。',
  },
  {
    icon:'🔥',
    bg:`linear-gradient(160deg,#fbeae8,#fde8cc)`,
    title:'続けることで\n自分が変わる',
    desc:'毎日ひとあし踏み出すだけ。\nストリークが積み重なるほど、自信になる。',
  },
  {
    icon:'💬',
    bg:`linear-gradient(160deg,#ede9fe,#dbeafe)`,
    title:'みんなと\n一緒に続ける',
    desc:'匿名の掲示板で今日の一歩をシェア。\n誰かの言葉が、明日の自分を動かす。',
  },
];

function OnboardingScreen({ onFinish }) {
  const [slide, setSlide]   = useState(0);
  const [name, setName]     = useState('');
  const [notif, setNotif]   = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const isLast = slide === ONBOARDING_SLIDES.length;
  const s = ONBOARDING_SLIDES[slide] || null;

  function next() {
    haptic('light');
    if (slide < ONBOARDING_SLIDES.length) {
      setAnimKey(k => k + 1);
      setSlide(s => s + 1);
    }
  }

  async function finish() {
    haptic('success');
    await sset('onboarded', true);
    await sset('user-name', name || 'あなた');
    if (notif) scheduleNotification(8, '🌱 今日のひとあし', '今日の小さなチャレンジが待っています。');
    onFinish(name || 'あなた');
  }

  return (
    <div style={{minHeight:'100vh',maxWidth:430,margin:'0 auto',fontFamily:"'Zen Kaku Gothic New',sans-serif",display:'flex',flexDirection:'column'}}>

      {/* スライド */}
      {!isLast && s && (
        <div key={animKey} style={{flex:1,background:s.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 32px 32px',animation:'fadeUp 0.4s ease'}}>
          <div style={{fontSize:96,marginBottom:32,animation:'float 3s ease-in-out infinite'}}>{s.icon}</div>
          <h1 style={{fontSize:26,fontWeight:900,color:T.ink,textAlign:'center',lineHeight:1.35,marginBottom:16,whiteSpace:'pre-line'}}>{s.title}</h1>
          <p style={{fontSize:15,color:T.inkM,textAlign:'center',lineHeight:1.8,fontFamily:"'Noto Serif JP',serif",whiteSpace:'pre-line'}}>{s.desc}</p>
        </div>
      )}

      {/* 最終スライド：設定 */}
      {isLast && (
        <div style={{flex:1,background:`linear-gradient(160deg,${T.sageXL},${T.cream})`,display:'flex',flexDirection:'column',padding:'52px 24px 32px',animation:'fadeUp 0.4s ease'}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{fontSize:64,marginBottom:16}}>👋</div>
            <h1 style={{fontSize:24,fontWeight:900,color:T.ink,marginBottom:8}}>はじめましょう！</h1>
            <p style={{fontSize:14,color:T.inkM}}>あなたのことを教えてください</p>
          </div>
          {/* 名前入力 */}
          <Card style={{padding:'18px 20px',marginBottom:12}}>
            <p style={{fontSize:13,fontWeight:700,color:T.inkL,marginBottom:10,letterSpacing:'0.06em'}}>あなたのニックネーム（任意）</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="例：さくら、たろう、匿名さん…"
              style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1.5px solid ${T.border}`,fontSize:15,fontFamily:'inherit',color:T.ink,background:T.cream}}/>
          </Card>
          {/* 通知 */}
          <Card style={{padding:'16px 20px',marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:2}}>🔔 毎朝8時にリマインド</p>
                <p style={{fontSize:12,color:T.inkL}}>習慣化をサポートする通知</p>
              </div>
              <button onClick={() => setNotif(v => !v)}
                style={{width:50,height:28,borderRadius:99,background:notif?T.sage:T.border,border:'none',cursor:'pointer',position:'relative',transition:'all 0.2s'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:T.white,position:'absolute',top:3,left:notif?25:3,transition:'all 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
              </button>
            </div>
          </Card>
          <Btn onClick={finish} variant="primary" style={{width:'100%',padding:18,fontSize:18}}>
            🌱 はじめる
          </Btn>
        </div>
      )}

      {/* 下部ナビ */}
      <div style={{background:T.white,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:`1px solid ${T.border}`}}>
        {/* ドット */}
        <div style={{display:'flex',gap:6}}>
          {[...ONBOARDING_SLIDES, {}].map((_,i) => (
            <div key={i} style={{width:i===slide?20:8,height:8,borderRadius:99,background:i===slide?T.sage:T.border,transition:'all 0.3s'}}/>
          ))}
        </div>
        {!isLast && (
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={async () => { await sset('onboarded', true); onFinish('あなた'); }}
              style={{background:'none',border:'none',fontSize:13,color:T.inkL,cursor:'pointer',fontFamily:'inherit'}}>スキップ</button>
            <Btn onClick={next} variant="primary" style={{padding:'12px 24px'}}>次へ →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 祝福エフェクト（Confetti）
// ════════════════════════════════════════════════════════════
function CelebrationEffect({ challenge, streak, onClose }) {
  const [particles, setParticles] = useState([]);
  const [phase, setPhase] = useState('boom'); // boom → show → fade

  useEffect(() => {
    // パーティクル生成
    const p = Array.from({length: 28}, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 8,
      vy: -(Math.random() * 6 + 4),
      rotate: Math.random() * 360,
      color: [T.sage, T.amber, T.rose, T.purple, T.teal, '#f9a825'][Math.floor(Math.random() * 6)],
      shape: ['■', '●', '▲', '★'][Math.floor(Math.random() * 4)],
      size: 8 + Math.random() * 10,
    }));
    setParticles(p);

    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('fade'), 2800);
    const t3 = setTimeout(() => onClose(), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',opacity:phase==='fade'?0:1,transition:'opacity 0.6s'}}>

      {/* パーティクル */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left:`${p.x}%`, top:`${p.y}%`,
          color: p.color, fontSize: p.size,
          transform: phase==='show' ? `translate(${p.vx*18}px,${p.vy*18}px) rotate(${p.rotate+180}deg)` : `translate(0,0) rotate(${p.rotate}deg)`,
          opacity: phase==='show' ? 0 : 1,
          transition: 'all 1.6s cubic-bezier(0.1,0.8,0.3,1)',
          pointerEvents:'none',
        }}>{p.shape}</div>
      ))}

      {/* メインカード */}
      <div style={{background:T.white,borderRadius:28,padding:'36px 32px',textAlign:'center',maxWidth:320,width:'calc(100% - 48px)',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',animation:'countPop 0.5s ease',position:'relative',zIndex:1}}>
        <div style={{fontSize:72,marginBottom:8,animation:'float 2s ease-in-out infinite'}}>{challenge.icon}</div>
        <h2 style={{fontSize:26,fontWeight:900,color:T.ink,marginBottom:6}}>完了！✨</h2>
        <p style={{fontSize:16,color:T.inkM,marginBottom:20,fontFamily:"'Noto Serif JP',serif",lineHeight:1.7}}>{challenge.title}を<br/>やり遂げました。</p>

        {/* ストリーク */}
        <div style={{background:`linear-gradient(135deg,${T.amber},#f0bc60)`,borderRadius:16,padding:'12px 20px',marginBottom:20,display:'inline-flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:28}}>🔥</span>
          <div style={{textAlign:'left'}}>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.8)',margin:0}}>連続記録</p>
            <p style={{fontSize:22,fontWeight:900,color:T.white,margin:0}}>{streak}日目</p>
          </div>
        </div>

        {/* メッセージ */}
        <p style={{fontSize:13,color:T.inkL,marginBottom:24,lineHeight:1.7}}>
          {streak === 1 ? '🌱 最初の一歩を踏み出しました！' :
           streak < 7  ? `${streak}日連続！調子いいですね。` :
           streak < 30 ? `${streak}日連続！習慣になってきた！` :
           `${streak}日連続！もう止まれない🔥`}
        </p>

        <button onClick={onClose}
          style={{width:'100%',padding:14,borderRadius:16,background:`linear-gradient(135deg,${T.sage},${T.sageL})`,border:'none',fontSize:16,fontWeight:700,color:T.white,cursor:'pointer',boxShadow:`0 4px 20px ${T.sage}55`}}>
          閉じる
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// プロフィール・設定画面
// ════════════════════════════════════════════════════════════
function ProfileScreen({ userName, streak, onNameChange }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [resetConfirm, setResetConfirm] = useState(false);

  async function saveName() {
    haptic('light');
    await sset('user-name', nameInput);
    onNameChange(nameInput);
    setEditing(false);
  }

  async function resetAll() {
    haptic('error');
    await sset('today-done', false);
    await sset('streak', 0);
    await sset('history', {});
    await sset('goals', []);
    setResetConfirm(false);
    window.location.reload();
  }

  const joinDate = new Date();
  joinDate.setDate(joinDate.getDate() - streak);

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>プロフィール 👤</h2>
      </div>

      {/* アバター＋名前 */}
      <div style={{textAlign:'center',marginBottom:24}}>
        <div style={{width:88,height:88,borderRadius:'50%',background:`linear-gradient(135deg,${T.sage},${T.sageL})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,margin:'0 auto 12px',boxShadow:`0 6px 24px ${T.sage}44`}}>
          🌱
        </div>
        {editing ? (
          <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center'}}>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)}
              style={{padding:'8px 14px',borderRadius:12,border:`1.5px solid ${T.sage}`,fontSize:16,fontFamily:'inherit',textAlign:'center',width:160,color:T.ink,background:T.cream}}
              autoFocus/>
            <button onClick={saveName} style={{padding:'8px 14px',borderRadius:12,background:T.sage,border:'none',color:T.white,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>保存</button>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <p style={{fontSize:22,fontWeight:900,color:T.ink}}>{userName}</p>
            <button onClick={() => setEditing(true)} style={{background:T.sageXL,border:'none',borderRadius:8,padding:'4px 8px',fontSize:12,color:T.sage,cursor:'pointer',fontWeight:700}}>編集</button>
          </div>
        )}
        <p style={{fontSize:12,color:T.inkL,marginTop:4}}>{streak}日目のひとあし旅</p>
      </div>

      {/* 実績バッジ */}
      <Card style={{padding:'18px 20px',marginBottom:12}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:14}}>実績バッジ</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[
            {icon:'🌱', label:'はじめの一歩', unlocked: streak >= 1},
            {icon:'🔥', label:'3日連続',      unlocked: streak >= 3},
            {icon:'⭐', label:'1週間',        unlocked: streak >= 7},
            {icon:'🏆', label:'1ヶ月',        unlocked: streak >= 30},
            {icon:'💎', label:'100日',        unlocked: streak >= 100},
            {icon:'🎯', label:'全カテゴリ',   unlocked: false},
          ].map(b => (
            <div key={b.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,width:64,opacity:b.unlocked?1:0.3}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:b.unlocked?`linear-gradient(135deg,${T.amber},#f0bc60)`:T.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,boxShadow:b.unlocked?`0 4px 12px ${T.amber}55`:'none'}}>
                {b.icon}
              </div>
              <p style={{fontSize:10,color:b.unlocked?T.inkM:T.inkL,textAlign:'center',lineHeight:1.3}}>{b.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 統計 */}
      <Card style={{padding:'18px 20px',marginBottom:12}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:12}}>統計</p>
        {[
          {label:'現在のストリーク', value:`${streak}日`},
          {label:'アプリを始めた日', value:`${joinDate.getMonth()+1}月${joinDate.getDate()}日`},
          {label:'お気に入りカテゴリ', value:'体 💪'},
        ].map(s => (
          <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
            <p style={{fontSize:14,color:T.inkM}}>{s.label}</p>
            <p style={{fontSize:14,fontWeight:700,color:T.ink}}>{s.value}</p>
          </div>
        ))}
      </Card>

      {/* リセット */}
      <Card style={{padding:'16px 20px',marginBottom:12}}>
        <p style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:4}}>データをリセット</p>
        <p style={{fontSize:12,color:T.inkL,marginBottom:12}}>ストリーク・履歴・目標がすべて削除されます</p>
        {!resetConfirm ? (
          <button onClick={() => setResetConfirm(true)}
            style={{width:'100%',padding:12,borderRadius:12,border:`1.5px solid ${T.rose}`,background:'transparent',color:T.rose,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
            リセットする
          </button>
        ) : (
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={() => setResetConfirm(false)} variant="ghost" style={{flex:1,padding:12}}>キャンセル</Btn>
            <button onClick={resetAll}
              style={{flex:1,padding:12,borderRadius:12,border:'none',background:T.rose,color:T.white,fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
              本当にリセット
            </button>
          </div>
        )}
      </Card>

      <p style={{fontSize:11,color:T.inkL,textAlign:'center',marginTop:16}}>ひとあし v1.0 🌱</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// チャレンジ履歴・カレンダー詳細
// ════════════════════════════════════════════════════════════
function HistoryScreen({ history }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // 月のカレンダー生成
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const blanks = (firstDay + 6) % 7; // 月曜始まり

  function prevMonth() { haptic('light'); if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); } else setViewMonth(m=>m-1); }
  function nextMonth() { haptic('light'); if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0); } else setViewMonth(m=>m+1); }

  const monthDone = Array.from({length: daysInMonth}, (_,i) => {
    const d = new Date(viewYear, viewMonth, i+1);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return history?.[k] || false;
  });

  const monthCount = monthDone.filter(Boolean).length;
  const DAYS_LABEL = ['月','火','水','木','金','土','日'];
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <div style={{padding:'0 16px 100px'}}>
      <div style={{padding:'52px 0 20px'}}>
        <h2 style={{fontSize:22,fontWeight:900,color:T.ink}}>チャレンジ履歴 📅</h2>
        <p style={{fontSize:13,color:T.inkL,marginTop:4}}>積み重ねた記録を振り返ろう</p>
      </div>

      {/* 月ナビ */}
      <Card style={{padding:'16px 20px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button onClick={prevMonth} style={{background:T.sageXL,border:'none',borderRadius:10,width:36,height:36,fontSize:16,cursor:'pointer'}}>‹</button>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:18,fontWeight:900,color:T.ink}}>{viewYear}年 {MONTHS[viewMonth]}</p>
            <p style={{fontSize:12,color:T.sage,fontWeight:700}}>{monthCount}日達成 🌱</p>
          </div>
          <button onClick={nextMonth} style={{background:T.sageXL,border:'none',borderRadius:10,width:36,height:36,fontSize:16,cursor:'pointer'}}>›</button>
        </div>

        {/* 曜日ヘッダー */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
          {DAYS_LABEL.map(d => (
            <div key={d} style={{textAlign:'center',fontSize:11,color:T.inkL,fontWeight:700,padding:'4px 0'}}>{d}</div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
          {Array.from({length: blanks}).map((_,i) => <div key={`b${i}`}/>)}
          {Array.from({length: daysInMonth}, (_,i) => {
            const day = i + 1;
            const done = monthDone[i];
            const isToday = viewYear===now.getFullYear() && viewMonth===now.getMonth() && day===now.getDate();
            const isFuture = new Date(viewYear, viewMonth, day) > now;
            return (
              <button key={day} onClick={() => { if (!isFuture) { haptic('light'); setSelectedDate({year:viewYear,month:viewMonth,day}); }}}
                style={{aspectRatio:'1',borderRadius:10,border: isToday?`2px solid ${T.sage}`:'2px solid transparent',background:done?T.sage:isFuture?'transparent':T.sageXL,display:'flex',alignItems:'center',justifyContent:'center',cursor:isFuture?'default':'pointer',flexDirection:'column',gap:1}}>
                <span style={{fontSize:13,fontWeight:isToday?900:400,color:done?T.white:isFuture?T.border:T.ink}}>{day}</span>
                {done && <span style={{fontSize:8,color:'rgba(255,255,255,0.8)'}}>✓</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 選択日詳細 */}
      {selectedDate && (
        <Card style={{padding:'18px 20px',marginBottom:12,background:T.sageXL,border:'none',animation:'fadeUp 0.3s ease'}}>
          <p style={{fontSize:14,fontWeight:700,color:T.sage,marginBottom:8}}>
            {selectedDate.month+1}月{selectedDate.day}日
          </p>
          {monthDone[selectedDate.day-1] ? (
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:28}}>🌱</span>
              <p style={{fontSize:14,color:T.inkM,fontFamily:"'Noto Serif JP',serif"}}>この日はチャレンジを達成しました！</p>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:28}}>💤</span>
              <p style={{fontSize:14,color:T.inkM,fontFamily:"'Noto Serif JP',serif"}}>この日は休んだ日。それでいい。</p>
            </div>
          )}
        </Card>
      )}

      {/* 月別サマリー帯グラフ */}
      <Card style={{padding:'18px 20px'}}>
        <p style={{fontSize:12,fontWeight:700,color:T.inkL,letterSpacing:'0.1em',marginBottom:12}}>達成率</p>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1,background:T.border,borderRadius:99,height:10,overflow:'hidden'}}>
            <div style={{width:`${Math.round(monthCount/daysInMonth*100)}%`,height:'100%',background:`linear-gradient(90deg,${T.sage},${T.sageL})`,borderRadius:99,transition:'width 0.6s'}}/>
          </div>
          <span style={{fontSize:15,fontWeight:700,color:T.sage,flexShrink:0}}>{Math.round(monthCount/daysInMonth*100)}%</span>
        </div>
        <p style={{fontSize:12,color:T.inkL,marginTop:8}}>{daysInMonth}日中 {monthCount}日達成</p>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Root
// ════════════════════════════════════════════════════════════

// BottomNavのタブを更新（プロフィール追加）
const NAV_UPDATED = [
  {id:'home',    icon:'🏠', label:'ホーム'},
  {id:'board',   icon:'💬', label:'掲示板'},
  {id:'goals',   icon:'🎯', label:'目標'},
  {id:'history', icon:'📅', label:'履歴'},
  {id:'profile', icon:'👤', label:'マイページ'},
];

function BottomNavNew({ current, onChange }) {
  return (
    <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:430,background:'rgba(250,247,242,0.96)',backdropFilter:'blur(16px)',borderTop:`1px solid ${T.border}`,display:'flex',zIndex:100}}>
      {NAV_UPDATED.map(n => (
        <button key={n.id} onClick={() => { haptic('light'); onChange(n.id); }}
          style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0 12px',background:'none',border:'none',cursor:'pointer',position:'relative',gap:3}}>
          <span style={{fontSize:20,filter:current===n.id?'none':'grayscale(0.6) opacity(0.55)'}}>{n.icon}</span>
          <span style={{fontSize:9,fontWeight:current===n.id?'700':'400',color:current===n.id?T.sage:T.inkL}}>{n.label}</span>
          {current===n.id && <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:24,height:3,background:T.sage,borderRadius:'99px 99px 0 0'}}/>}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  const [onboarded, setOnboarded]             = useState(null); // null=loading
  const [userName, setUserName]               = useState('あなた');
  const [screen, setScreen]                   = useState('home');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [showPicker, setShowPicker]           = useState(false);
  const [todayDone, setTodayDone]             = useState(false);
  const [streak, setStreak]                   = useState(0);
  const [history, setHistory]                 = useState({});
  const [celebration, setCelebration]         = useState(null); // {challenge, streak}

  useEffect(() => {
    Promise.all([
      sget('onboarded'),
      sget('user-name'),
      sget('today-done'),
      sget('streak'),
      sget('history'),
    ]).then(([ob, name, done, str, hist]) => {
      setOnboarded(!!ob);
      if (name)  setUserName(name);
      if (done)  setTodayDone(true);
      if (str)   setStreak(str);
      if (hist)  setHistory(hist);
    });
    if (typeof window !== 'undefined' && window.speechSynthesis)
      window.speechSynthesis.getVoices();
    sget('notif-settings').then(v => {
      const h = v?.hour ?? 8;
      scheduleNotification(h, '🌱 今日のひとあし', '今日の小さなチャレンジが待っています。');
    });
  }, []);

  async function handleComplete() {
    const ns = streak + 1;
    const today = todayKey();
    const newHistory = { ...history, [today]: true };
    setTodayDone(true); setStreak(ns); setHistory(newHistory);
    await sset('today-done', true);
    await sset('streak', ns);
    await sset('history', newHistory);
    // 祝福エフェクト表示
    setCelebration({ challenge: activeChallenge, streak: ns });
    setActiveChallenge(null);
    notifyChallengeComplete();
  }

  function handleOnboardingFinish(name) {
    setUserName(name);
    setOnboarded(true);
  }

  const wrapper = {
    background: T.cream, minHeight:'100vh', maxWidth:430,
    margin:'0 auto', position:'relative', fontFamily:"'Zen Kaku Gothic New',sans-serif",
  };

  // ローディング中
  if (onboarded === null) return (
    <div style={{...wrapper, display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh'}}>
      <div style={{fontSize:48, animation:'float 2s ease-in-out infinite'}}>🌱</div>
    </div>
  );

  // オンボーディング
  if (!onboarded) return <OnboardingScreen onFinish={handleOnboardingFinish}/>;

  // チャレンジランナー
  if (activeChallenge) return (
    <div style={wrapper}>
      <ChallengeRunner challenge={activeChallenge} onComplete={handleComplete} onBack={() => setActiveChallenge(null)}/>
    </div>
  );

  // チャレンジ選択
  if (showPicker) return (
    <div style={wrapper}>
      <ChallengePicker onSelect={ch => { setActiveChallenge(ch); setShowPicker(false); }} onBack={() => setShowPicker(false)}/>
    </div>
  );

  return (
    <div style={wrapper}>
      {/* 祝福エフェクト */}
      {celebration && (
        <CelebrationEffect
          challenge={celebration.challenge}
          streak={celebration.streak}
          onClose={() => setCelebration(null)}
        />
      )}

      {screen==='home'    && <HomeScreen onStart={setActiveChallenge} onPick={() => setShowPicker(true)} onGoBoard={() => setScreen('board')} todayDone={todayDone} streak={streak}/>}
      {screen==='board'   && <BoardScreen/>}
      {screen==='goals'   && <GoalsScreen/>}
      {screen==='history' && <HistoryScreen history={history}/>}
      {screen==='profile' && <ProfileScreen userName={userName} streak={streak} onNameChange={setUserName}/>}
      <BottomNavNew current={screen} onChange={setScreen}/>
    </div>
  );
}
