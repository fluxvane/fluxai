// Splits raw streamed assistant content into the visible answer and any
// inline <think>…</think> reasoning. `open` is true while a think block is
// still unclosed (model is mid-thought).
export function splitThink(raw: string): {
  answer: string;
  think: string;
  open: boolean;
} {
  let answer = "";
  let think = "";
  let open = false;
  let i = 0;

  while (i < raw.length) {
    if (!open) {
      const start = raw.indexOf("<think>", i);
      if (start === -1) {
        answer += raw.slice(i);
        break;
      }
      answer += raw.slice(i, start);
      i = start + "<think>".length;
      open = true;
    } else {
      const end = raw.indexOf("</think>", i);
      if (end === -1) {
        think += raw.slice(i);
        break;
      }
      think += raw.slice(i, end);
      i = end + "</think>".length;
      open = false;
    }
  }

  return { answer: answer.trimStart(), think, open };
}
