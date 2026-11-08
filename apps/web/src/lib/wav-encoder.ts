function encodeWav(buffer: AudioBuffer): Blob {
  const view = new DataView(new ArrayBuffer(44 + buffer.length * 2));
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, buffer.length * 2, true);

  /*
    ── `getChannelData` ZWRACA Float32Array, A NIE ZWYKŁĄ TABLICĘ ───────
    Przy `noUncheckedIndexedAccess` TypeScript traktuje KAŻDY odczyt
    z indeksu jako możliwie `undefined` — także `channel[i]`. Wyrażenie
    `Math.min(1, channel[i])` przerywało build produkcyjny:

        Type error: Argument of type 'number | undefined' is not assignable
        to parameter of type 'number'.

    Rzutowanie `!` byłoby tu bezpieczne, bo `getChannelData` zwraca bufor
    o długości dokładnie `buffer.length` — ale wolę je zostawić na wypadek
    sytuacji, w której to założenie przestanie być prawdziwe, a błąd
    wyjdzie dopiero w dźwięku. Dlatego odczytujemy raz do zmiennej,
    pomijamy brak i dopiero liczymy próbkę. Cisza w jednej próbce jest
    niesłyszalna; NaN w pliku WAV czyni go nieczytelnym.
  */
  const channel = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channel.length; i += 1) {
    const sample = channel[i];
    if (sample === undefined) {
      view.setInt16(offset, 0, true);
      offset += 2;
      continue;
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}
