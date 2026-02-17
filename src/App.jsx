import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Gauge, HeartPulse, Swords } from 'lucide-react';

const initialCharacters = [
  { id: 1, name: '高津小春', height: 161, power: 73, speed: 75, technique: 47, stamina: 85, mental: 96, influence: '★★', style: 'Striker', role: 'Babyface' },
  { id: 2, name: '澤出みずき', height: 158, power: 73, speed: 78, technique: 73, stamina: 73, mental: 72, influence: '■', style: 'Allrounder', role: 'Babyface' },
  { id: 4, name: '富岡加奈子', height: 168, power: 86, speed: 61, technique: 70, stamina: 74, mental: 83, influence: '★★★★', style: 'Power', role: 'Heel' },
  { id: 7, name: '副沢たまき', height: 161, power: 71, speed: 68, technique: 74, stamina: 68, mental: 68, influence: '★★', style: 'Technique', role: 'Babyface' },
  { id: 6, name: '深町真琴', height: 160, power: 55, speed: 90, technique: 53, stamina: 85, mental: 63, influence: '★★★', style: 'Speed', role: 'Babyface' },
  { id: 11, name: '橘玲美', height: 171, power: 71, speed: 73, technique: 89, stamina: 75, mental: 74, influence: '★★★★', style: 'Submission', role: 'Heel' },
  { id: 12, name: '生駒エリカ', height: 153, power: 78, speed: 71, technique: 55, stamina: 76, mental: 82, influence: '★★★', style: 'Brawler', role: 'Heel' },
  { id: 16, name: '川野辺菜穂子', height: 168, power: 66, speed: 80, technique: 69, stamina: 71, mental: 76, influence: '★★★★', style: 'Technique', role: 'Babyface' },
  { id: 17, name: '岸ゆみえ', height: 155, power: 43, speed: 48, technique: 78, stamina: 64, mental: 61, influence: '★★', style: 'Technique', role: 'Babyface' },
  { id: 18, name: '大河内紗代子', height: 164, power: 93, speed: 72, technique: 63, stamina: 68, mental: 77, influence: '★★★★★', style: 'Power', role: 'Heel' },
  { id: 21, name: '四条あずさ', height: 163, power: 64, speed: 68, technique: 62, stamina: 67, mental: 62, influence: '★★', style: 'Allrounder', role: 'Heel' },
];

const styleMoves = {
  Striker: ['ローキック', 'ミドルキック', 'ジャンピングニー'],
  Allrounder: ['ドロップキック', 'DDT', 'ブレーンバスター'],
  Power: ['ショルダータックル', 'ラリアット', 'パワーボム'],
  Technique: ['アームホイップ', 'ドラゴンスクリュー', 'スープレックス'],
  Speed: ['スライディングキック', 'ヘッドシザーズ', '旋回式DDT'],
  Submission: ['腕ひしぎ十字固め', '逆エビ固め', '三角締め'],
  Brawler: ['エルボースマッシュ', 'バックハンドブロー', '場外乱闘パンチ'],
};

const phaseTable = [
  { limit: 4, name: 'Opening', multiplier: 0.9 },
  { limit: 8, name: 'Mid', multiplier: 1.05 },
  { limit: 12, name: 'End', multiplier: 1.2 },
  { limit: Number.MAX_SAFE_INTEGER, name: 'Climax', multiplier: 1.4 },
];

const createSoundEngine = () => {
  let context;
  const setup = () => {
    if (!context) {
      context = new window.AudioContext();
    }
    if (context.state === 'suspended') {
      context.resume();
    }
    return context;
  };

  const beep = (frequency = 640, duration = 0.08, type = 'square', volume = 0.06) => {
    const ctx = setup();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.stop(ctx.currentTime + duration);
  };

  return {
    click: () => beep(520, 0.04, 'square', 0.05),
    impact: () => {
      beep(190, 0.1, 'sawtooth', 0.075);
      setTimeout(() => beep(120, 0.06, 'triangle', 0.05), 30);
    },
    finish: () => {
      beep(720, 0.06, 'square', 0.06);
      setTimeout(() => beep(840, 0.1, 'square', 0.06), 75);
    },
  };
};

const getPhaseInfo = (turn) => phaseTable.find((phase) => turn <= phase.limit) ?? phaseTable.at(-1);
const hpFromStamina = (stamina) => Math.round(stamina * 1.9);

const selectTwoCharacters = () => {
  const first = initialCharacters[Math.floor(Math.random() * initialCharacters.length)];
  let second = first;
  while (second.id === first.id) {
    second = initialCharacters[Math.floor(Math.random() * initialCharacters.length)];
  }
  return [first, second];
};

const buildFighter = (character) => ({ ...character, maxHp: hpFromStamina(character.stamina), hp: hpFromStamina(character.stamina) });

const randomMove = (style) => {
  const moves = styleMoves[style] ?? ['エルボー'];
  return moves[Math.floor(Math.random() * moves.length)];
};

function App() {
  const [leftBase, rightBase] = useMemo(() => selectTwoCharacters(), []);
  const [left, setLeft] = useState(buildFighter(leftBase));
  const [right, setRight] = useState(buildFighter(rightBase));
  const [turn, setTurn] = useState(1);
  const [momentum, setMomentum] = useState(0);
  const [logs, setLogs] = useState(['ゴング！試合開始！']);
  const [currentMove, setCurrentMove] = useState('---');
  const [winner, setWinner] = useState(null);
  const [shakeTarget, setShakeTarget] = useState('');
  const sound = useRef(null);

  const phase = getPhaseInfo(turn);

  const actTurn = () => {
    if (winner) return;
    if (!sound.current) sound.current = createSoundEngine();
    sound.current.click();

    const attackerIsLeft = Math.random() + momentum * 0.003 > 0.5;
    const attacker = attackerIsLeft ? left : right;
    const defender = attackerIsLeft ? right : left;

    const move = randomMove(attacker.style);
    const offense = attacker.power * 0.45 + attacker.speed * 0.25 + attacker.technique * 0.3;
    const defense = defender.stamina * 0.35 + defender.mental * 0.25;
    const momentumBonus = attackerIsLeft ? Math.max(momentum, 0) * 0.09 : Math.max(-momentum, 0) * 0.09;
    const swing = Math.random() * 8 + 2;
    const rawDamage = (offense * 0.22 + momentumBonus + swing - defense * 0.09) * phase.multiplier;
    const damage = Math.max(4, Math.round(rawDamage));

    const newDefender = { ...defender, hp: defender.hp - damage };
    const momentumGain = Math.min(16, Math.max(6, Math.round(damage * 0.6)));
    const newMomentum = attackerIsLeft ? Math.min(100, momentum + momentumGain) : Math.max(-100, momentum - momentumGain);

    setCurrentMove(`${attacker.name}：${move}`);
    setShakeTarget(attackerIsLeft ? 'right' : 'left');
    setTimeout(() => setShakeTarget(''), 240);
    sound.current.impact();

    const baseLog = `Turn ${turn} [${phase.name}] ${attacker.name}の${move}！ ${defender.name}に${damage}ダメージ。`;

    if (attackerIsLeft) {
      setRight(newDefender);
    } else {
      setLeft(newDefender);
    }

    setMomentum(newMomentum);

    if (newDefender.hp <= 0) {
      const finishType = Math.random() + attacker.technique * 0.004 > 0.6 ? 'フォール勝ち' : 'ギブアップ勝ち';
      setWinner(attacker.name);
      sound.current.finish();
      setLogs((prev) => [`${baseLog} ${attacker.name}が${finishType}で決着！`, ...prev].slice(0, 12));
      return;
    }

    setLogs((prev) => [baseLog, ...prev].slice(0, 12));
    setTurn((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <h1 className="text-center text-2xl font-bold tracking-wider text-fuchsia-300 md:text-3xl">学園女子プロレス・ターン制シミュレーター</h1>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
          <FighterCard fighter={left} side="left" shake={shakeTarget === 'left'} />

          <section className="rounded-2xl border border-fuchsia-500/30 bg-slate-900/90 p-4 shadow-[0_0_20px_rgba(217,70,239,0.15)]">
            <div className="mb-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><Swords className="h-4 w-4 text-fuchsia-300" />Turn {turn}</div>
              <div className="rounded-full bg-fuchsia-500/20 px-3 py-1 font-semibold text-fuchsia-200">Phase: {phase.name}</div>
            </div>

            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Move</p>
              <p className="mt-2 text-lg font-bold text-emerald-300">{currentMove}</p>
            </div>

            <MomentumGauge momentum={momentum} left={left.name} right={right.name} />

            <div className="mt-4 h-72 overflow-auto rounded-xl border border-slate-700 bg-slate-950/80 p-3">
              {logs.map((entry) => (
                <p key={entry} className="mb-2 text-sm leading-relaxed text-slate-200">・{entry}</p>
              ))}
            </div>
          </section>

          <FighterCard fighter={right} side="right" shake={shakeTarget === 'right'} />
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={actTurn}
          disabled={Boolean(winner)}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-5 text-lg font-black tracking-wider text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-5 w-5" />
          {winner ? `${winner} WIN!` : 'NEXT TURN'}
        </motion.button>
      </div>
    </div>
  );
}

function FighterCard({ fighter, side, shake }) {
  const hpRate = Math.max(0, (fighter.hp / fighter.maxHp) * 100);

  return (
    <section className="rounded-2xl border border-cyan-400/30 bg-slate-900/90 p-4 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
      <h2 className="text-xl font-bold text-cyan-200">{fighter.name}</h2>
      <p className="text-xs text-slate-400">{fighter.role} / {fighter.style} / {fighter.height}cm</p>

      <motion.div
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.28 }}
        className="mt-3 flex h-44 items-center justify-center rounded-lg bg-gray-800 text-center text-sm font-semibold text-slate-200"
      >
        <div>
          <p className="text-xs text-slate-400">立ち絵プレースホルダー</p>
          <p className="mt-1">{fighter.name}</p>
          <p className="text-xs text-slate-500">{side === 'left' ? 'LEFT CORNER' : 'RIGHT CORNER'}</p>
        </div>
      </motion.div>

      <div className="mt-4 space-y-2 text-sm">
        <StatRow icon={<HeartPulse className="h-4 w-4" />} label="HP" value={`${Math.max(0, fighter.hp)} / ${fighter.maxHp}`} />
        <div className="h-2 overflow-hidden rounded bg-slate-700">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-lime-500 transition-all" style={{ width: `${hpRate}%` }} />
        </div>
        <StatRow icon={<Gauge className="h-4 w-4" />} label="Power / Speed / Tech" value={`${fighter.power} / ${fighter.speed} / ${fighter.technique}`} />
        <p className="text-xs text-slate-400">Influence: {fighter.influence} ・ Mental: ???</p>
      </div>
    </section>
  );
}

function MomentumGauge({ momentum, left, right }) {
  const leftRatio = Math.max(0, 50 + momentum / 2);
  const rightRatio = 100 - leftRatio;

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Momentum</p>
      <div className="h-4 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
        <div className="flex h-full">
          <motion.div animate={{ width: `${leftRatio}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" />
          <motion.div animate={{ width: `${rightRatio}%` }} className="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500" />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

function StatRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded bg-slate-800/80 px-2 py-1">
      <span className="flex items-center gap-1 text-slate-300">{icon}{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export default App;
