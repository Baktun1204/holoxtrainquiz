import { useEffect, useState } from "react";
import quizData from "./quiz-data.json";
import { EXPLANATIONS } from "./explanations";

type QuizItem = {
  id: string;
  englishName: string;
  japaneseName: string;
  affiliate: boolean;
  generation: string;
  branch: "JP" | "EN" | "ID" | "DEV_IS";
  branchLabel: string;
  train: string;
  trainEnglish: string;
  vehicleDescription: string;
  matchDescription: string;
};

type Phase = "intro" | "quiz" | "result";

const QUESTIONS = quizData as QuizItem[];
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

function shuffle<T>(items: readonly T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 正解1つ + 誤答プールからランダムに3つ(重複なし)を選び、4択をシャッフルする。
// 誤答は同じブランチの車両を優先して、選択肢の紛らわしさを保つ。
function optionsFor(question: QuizItem) {
  const sameBranch = QUESTIONS.filter(
    (item) => item.branch === question.branch && item.id !== question.id,
  );
  const otherBranch = QUESTIONS.filter(
    (item) => item.branch !== question.branch && item.id !== question.id,
  );
  const pool = [...shuffle(sameBranch), ...shuffle(otherBranch)];
  const labels = [question.train];
  for (const item of pool) {
    if (!labels.includes(item.train)) labels.push(item.train);
    if (labels.length === 4) break;
  }
  return shuffle(labels);
}

type Round = {
  question: QuizItem;
  options: string[];
};

function buildRounds(): Round[] {
  return shuffle(QUESTIONS).map((question) => ({
    question,
    options: optionsFor(question),
  }));
}

function branchLabel(branch: QuizItem["branch"]) {
  if (branch === "DEV_IS") return "DEV_IS";
  return `HOLOLIVE ${branch}`;
}

function performanceCopy(rate: number) {
  if (rate >= 90) return "特急級の鉄道図鑑レベルです。前面の形状と塗装をほぼ完璧に読み取りました。";
  if (rate >= 75) return "見事な運行でした。車両の個性とメンバーのマッチングを的確に見抜きましたね。";
  if (rate >= 55) return "良い成績です。解説で、見逃した車両の特徴をもう一度チェックしてみましょう。";
  return "初運行、おつかれさまでした。車両の特徴がわかった今、次の挑戦はぐっと楽になるはずです。";
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>(buildRounds);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const current = rounds[index]?.question ?? QUESTIONS[0];
  const explanation = EXPLANATIONS[current.id];
  const options = rounds[index]?.options ?? [];
  const answered = selected !== null;
  const isCorrect = selected === current.train;
  const progress = ((index + 1) / rounds.length) * 100;
  const rate = Math.round((score / rounds.length) * 100);

  const beginQuiz = () => {
    setRounds(buildRounds());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setPhase("quiz");
  };

  const selectAnswer = (choice: string) => {
    if (answered) return;
    setSelected(choice);
    if (choice === current.train) setScore((value) => value + 1);
  };

  const nextQuestion = () => {
    if (!answered) return;
    if (index === rounds.length - 1) {
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== "quiz") return;
      if (!answered && /^[1-4]$/.test(event.key)) {
        selectAnswer(options[Number(event.key) - 1]);
      } else if (answered && event.key === "Enter") {
        nextQuestion();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="site-shell">
      <div className="ambient ambient-cyan" aria-hidden="true" />
      <div className="ambient ambient-pink" aria-hidden="true" />

      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={() => setPhase("intro")}
          aria-label="トップに戻る"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>HOLO RAIL</strong>
            <small>ARTWORK TRAIN QUIZ</small>
          </span>
        </button>
        <div className="header-meta">
          <span>{phase === "quiz" ? `QUESTION ${String(index + 1).padStart(2, "0")}` : "65 ARTWORKS"}</span>
          <i />
          <span>{phase === "quiz" ? `${score} CORRECT` : "4 CHOICES"}</span>
        </div>
      </header>

      {phase === "intro" && (
        <section className="intro-screen">
          <div className="intro-copy">
            <p className="eyebrow"><span /> FAN-MADE RAILWAY QUIZ</p>
            <h1>
              イラストの中の電車、<br />
              <em>いくつわかりますか？</em>
            </h1>
            <p className="intro-description">
              ホロライブメンバーと日本の電車をひとつの場面に描いた65枚のアートワークを見て、
              画像の中の車両形式を4択で当ててみましょう。
            </p>
            <div className="intro-facts" aria-label="クイズの構成">
              <div><strong>65</strong><span>問題数</span></div>
              <div><strong>4</strong><span>選択肢</span></div>
              <div><strong>2</strong><span>解説段落</span></div>
            </div>
            <button className="primary-cta" type="button" onClick={beginQuiz}>
              クイズをはじめる
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
            <p className="keyboard-note">数字キー1〜4で解答、Enterで次の問題へ進めます。</p>
            <p className="disclaimer-note">
              本作は個人が趣味で制作した非公式のファンメイドクイズで、掲載しているアートワークはすべてAIで生成したイラストです。
              ホロライブおよび各キャラクターに関する権利はカバー株式会社に、車両のデザイン等に関する権利はそれぞれの鉄道事業者に帰属します。
              カバー株式会社および各鉄道事業者とは一切関係ありません。
            </p>
          </div>

          <div className="intro-art" aria-label="クイズアートワークのプレビュー">
            <div className="art-card art-card-main">
              <img
                src={assetUrl("artworks/tokino-sora.webp")}
                alt="ときのそらと小田急VSEのアートワーク"
                width="1200"
                height="676"
                fetchPriority="high"
              />
              <span>MEMBER × TRAIN</span>
            </div>
            <div className="art-card art-card-top" aria-hidden="true">
              <img src={assetUrl("artworks/kobo-kanaeru.webp")} alt="" width="1200" height="676" loading="lazy" />
            </div>
            <div className="art-card art-card-bottom" aria-hidden="true">
              <img src={assetUrl("artworks/elizabeth-rose-bloodflame.webp")} alt="" width="1200" height="676" loading="lazy" />
            </div>
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
          </div>
        </section>
      )}

      {phase === "quiz" && (
        <section className="quiz-screen" aria-live="polite">
          <div className="progress-deck">
            <div>
              <span>QUIZ PROGRESS</span>
              <strong>{String(index + 1).padStart(2, "0")} <i>/</i> {rounds.length}</strong>
            </div>
            <div className="progress-track" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
            <div className="score-chip"><span>正解数</span><strong>{score}</strong></div>
          </div>

          <div className="quiz-frame" key={current.id}>
            <article className="artwork-panel">
              <img
                src={assetUrl(`artworks/${current.id}.webp`)}
                alt={`${current.japaneseName}と日本の電車が描かれたクイズアートワーク`}
                width="1200"
                height="676"
                fetchPriority="high"
                decoding="async"
              />
              <div className="artwork-shade" />
              <div className="artwork-topline">
                <span>{branchLabel(current.branch)}</span>
                <span>Q.{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="member-title">
                <small>{current.japaneseName}</small>
                <h2>{current.englishName}</h2>
                <span>{current.generation}</span>
              </div>
              <div className="question-mark" aria-hidden="true">?</div>
            </article>

            <article className="answer-panel">
              <div className="question-copy">
                <p>SELECT THE TRAIN</p>
                <h2>画像の中の電車は<br />どの車両でしょう？</h2>
                <span>正解だと思う車両形式を選んでください。</span>
              </div>

              <div className="choice-list" role="group" aria-label="車両の選択肢">
                {options.map((choice, choiceIndex) => {
                  const state = !answered
                    ? ""
                    : choice === current.train
                      ? "is-correct"
                      : choice === selected
                        ? "is-wrong"
                        : "is-muted";
                  return (
                    <button
                      className={`choice-button ${state}`}
                      type="button"
                      key={choice}
                      disabled={answered}
                      onClick={() => selectAnswer(choice)}
                    >
                      <span className="choice-number">{choiceIndex + 1}</span>
                      <span className="choice-text">{choice}</span>
                      <span className="choice-icon" aria-hidden="true">
                        {state === "is-correct" ? "✓" : state === "is-wrong" ? "×" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {answered && (
                <section className={`answer-reveal ${isCorrect ? "correct" : "wrong"}`}>
                  <div className="answer-status">
                    <span aria-hidden="true">{isCorrect ? "✓" : "×"}</span>
                    <div>
                      <small>{isCorrect ? "CORRECT" : "NOT QUITE"}</small>
                      <strong>{isCorrect ? "正解です！" : "残念、不正解です。"}</strong>
                    </div>
                  </div>
                  <div className="answer-heading">
                    <span>ANSWER</span>
                    <strong>{current.train}</strong>
                    <small>{current.trainEnglish}</small>
                  </div>
                  <div className="explanation-copy">
                    <p>
                      <b>車両のはなし。</b> {explanation.vehicle}
                    </p>
                    <p>
                      <b>なぜ{current.japaneseName}と合うの？</b> {explanation.match}
                    </p>
                  </div>
                </section>
              )}

              <button className="next-button" type="button" disabled={!answered} onClick={nextQuestion}>
                {index === rounds.length - 1 ? "最終スコアを見る" : "次の問題へ"}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
              </button>
            </article>
          </div>
        </section>
      )}

      {phase === "result" && (
        <section className="result-screen">
          <div className="result-art" aria-hidden="true">
            <img src={assetUrl("artworks/hoshimachi-suisei.webp")} alt="" width="1200" height="676" loading="lazy" />
            <div />
          </div>
          <div className="result-card">
            <p className="eyebrow"><span /> QUIZ COMPLETE</p>
            <h1>終点に到着しました！</h1>
            <div className="final-score">
              <strong>{score}</strong>
              <span>/ {rounds.length}</span>
            </div>
            <div className="rate-row">
              <span>正解率</span>
              <strong>{rate}%</strong>
              <i><b style={{ width: `${rate}%` }} /></i>
            </div>
            <p className="result-message">{performanceCopy(rate)}</p>
            <div className="result-stats">
              <div><span>正解した問題</span><strong>{score}</strong></div>
              <div><span>ミスした問題</span><strong>{rounds.length - score}</strong></div>
              <div><span>問題数</span><strong>{rounds.length}</strong></div>
            </div>
            <div className="result-actions">
              <button className="secondary-button" type="button" onClick={() => setPhase("intro")}>トップに戻る</button>
              <button className="primary-cta" type="button" onClick={beginQuiz}>
                もう一度挑戦する
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      <footer>
        <span>HOLO RAIL</span>
        <p>非公式ファンメイド作品・アートワークはAI生成・キャラクター © COVER Corp.・車両デザインの権利は各鉄道事業者に帰属します</p>
      </footer>
    </main>
  );
}
