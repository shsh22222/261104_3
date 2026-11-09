// 今の一句: 知覚の言葉と、思考の解説の言葉を見分ける。
// 禁止ではなく、気づきの鏡として使う。

export const RULES = [
  {
    cat: 'judge',
    label: '評価',
    re: /最悪|最高|嫌い|嫌だ|いやだ|むかつ|ムカつ|うざ|ウザ|だめ|ダメ|ひどい|酷い|つまらな|退屈|素晴らし|すばらし|きれい|綺麗|美し|悪い|良い|いい感じ|好き|最低/g,
    hint: '心の評価が入ったようです。評価の手前にある、色、音、形、温度は？',
  },
  {
    cat: 'time',
    label: '時間',
    re: /明日|昨日|あした|きのう|将来|あとで|後で|いつか|早く|はやく|まだ|この先|昔|さっき|これから|来週|先週|来年|去年/g,
    hint: '心が過去か未来へ出かけたようです。いま、ここにあるものは？',
  },
  {
    cat: 'story',
    label: '物語',
    re: /べき|はず|なければ|なきゃ|どうせ|いつも|絶対|なんで|なぜ|と思う|気がする|だろう|かもしれない|せいで/g,
    hint: '物語が少し入りました。事実と感覚だけを書くと？',
  },
];

const SENSE = /音|光|風|匂|香|冷た|温か|暖か|柔らか|硬|固|重|軽|色|影|白|青|赤|緑|黒|黄|水|雨|雪|空|雲|手|足|息|肌|指|湯|湯気|葉|土|石|静か|揺れ|ざら|つる|ぬる|しん/g;

/**
 * テキストを解析し、カテゴリごとの一致語とヒントを返す。
 * @returns {{ notes: {cat:string,label:string,words:string[],hint:string}[], senses: number }}
 */
export function analyzePerception(text) {
  const src = String(text || '');
  const notes = [];
  for (const r of RULES) {
    const found = src.match(r.re);
    if (found && found.length) {
      notes.push({ cat: r.cat, label: r.label, words: [...new Set(found)], hint: r.hint });
    }
  }
  const senses = (src.match(SENSE) || []).length;
  return { notes, senses };
}
