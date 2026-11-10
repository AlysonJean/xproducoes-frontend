import { describe, it, expect } from 'vitest';
import {
  buildInstagramEmbedUrl,
  formatInstagramDate,
  readPublicInstagramFeed,
  safeInstagramPermalink,
  summarizeCaption,
} from '../instagram';

// Pedido do dono de 09/11/2026 (Instagram): o site mostra as publicações importadas pelo servidor. O player do
// Instagram só é montado a partir de um endereço que é mesmo do Instagram; a legenda vira um resumo curto; a data sai
// no horário de Brasília.

describe('Instagram — endereço do player', () => {
  it('monta o player oficial a partir do endereço da publicação (foto, Reel e IGTV)', () => {
    expect(buildInstagramEmbedUrl('https://www.instagram.com/p/C1aB2c3D4e5/')).toBe('https://www.instagram.com/p/C1aB2c3D4e5/embed/');
    expect(buildInstagramEmbedUrl('https://www.instagram.com/reel/DAbc_12-x/')).toBe('https://www.instagram.com/reel/DAbc_12-x/embed/');
    expect(buildInstagramEmbedUrl('https://instagram.com/tv/XyZ9')).toBe('https://www.instagram.com/tv/XyZ9/embed/');
    // Parâmetros e o nome da conta antes do caminho ficam de fora.
    expect(buildInstagramEmbedUrl('https://www.instagram.com/reel/DAbc12/?utm_source=ig_web_copy_link')).toBe(
      'https://www.instagram.com/reel/DAbc12/embed/'
    );
    expect(buildInstagramEmbedUrl('https://www.instagram.com/x_producoeseventos/p/DAbc12/')).toBe(
      'https://www.instagram.com/p/DAbc12/embed/'
    );
  });

  it('recusa endereço que não é do Instagram ou que não é de uma publicação', () => {
    for (const bad of [
      'https://evil.example/reel/DAbc12/',
      'https://instagram.com.evil.example/p/DAbc12/',
      'https://www.instagram.com.br/p/DAbc12/',
      'https://notinstagram.com/p/DAbc12/',
      'http://www.instagram.com/p/DAbc12/',
      'javascript:alert(1)//www.instagram.com/p/DAbc12/',
      'https://user:pw@www.instagram.com/p/DAbc12/',
      'https://www.instagram.com:8443/p/DAbc12/',
      'https://www.instagram.com/stories/x_producoeseventos/123/',
      'https://www.instagram.com/p/DAbc12/embed/"onload="x',
      'https://www.instagram.com/x_producoeseventos/',
      '/p/DAbc12/',
      '',
    ]) {
      expect({ bad, embed: buildInstagramEmbedUrl(bad), link: safeInstagramPermalink(bad) }).toEqual({ bad, embed: null, link: null });
    }
    expect(buildInstagramEmbedUrl(null)).toBeNull();
    expect(buildInstagramEmbedUrl(undefined)).toBeNull();
  });

  it('o link "Ver no Instagram" sai do mesmo endereço conferido', () => {
    expect(safeInstagramPermalink('https://instagram.com/p/DAbc12?igsh=abc')).toBe('https://www.instagram.com/p/DAbc12/');
  });
});

describe('Instagram — resumo da legenda e data', () => {
  it('legenda curta fica igual, numa linha só', () => {
    expect(summarizeCaption('Camarote no Mineirão\n\nSom e luz   para 300 pessoas')).toBe('Camarote no Mineirão Som e luz para 300 pessoas');
    expect(summarizeCaption(null)).toBe('');
  });

  it('legenda longa é cortada em até 120 caracteres, numa palavra inteira, com reticências', () => {
    const long = `${'palavra '.repeat(30)}fim`;
    const summary = summarizeCaption(long);
    expect(Array.from(summary).length).toBeLessThanOrEqual(121);
    expect(summary.endsWith('palavra…')).toBe(true);
  });

  it('não corta um emoji no meio', () => {
    const summary = summarizeCaption(`${'🎉'.repeat(130)}`);
    expect(summary).toBe(`${'🎉'.repeat(120)}…`);
  });

  it('data no horário de Brasília (uma publicação às 2h30 UTC do dia 9 é do dia 8 em BH)', () => {
    expect(formatInstagramDate('2026-11-09T02:30:00.000Z')).toBe('8 de novembro de 2026');
    expect(formatInstagramDate('2026-11-09T15:00:00+0000')).toBe('9 de novembro de 2026');
    expect(formatInstagramDate('não é data')).toBe('');
  });
});

describe('Instagram — leitura da resposta da rota pública', () => {
  it('fica só o que dá para mostrar: com imagem e com endereço do Instagram', () => {
    const feed = readPublicInstagramFeed({
      username: 'x_producoeseventos',
      posts: [
        { id: 'a', mediaType: 'IMAGE', caption: 'ok', permalink: 'https://www.instagram.com/p/AAA/', postedAt: '2026-11-01T12:00:00Z', imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', isPinned: false, isVideo: false },
        { id: 'b', mediaType: 'IMAGE', caption: 'sem imagem', permalink: 'https://www.instagram.com/p/BBB/', postedAt: '2026-11-01T12:00:00Z', imageUrl: null, isPinned: false, isVideo: false },
        { id: 'c', mediaType: 'VIDEO', caption: 'outro site', permalink: 'https://evil.example/reel/CCC/', postedAt: '2026-11-01T12:00:00Z', imageUrl: 'https://res.cloudinary.com/x/image/upload/c.jpg', isPinned: false, isVideo: true },
      ],
    });
    expect(feed.username).toBe('x_producoeseventos');
    expect(feed.posts.map((post) => post.id)).toEqual(['a']);
  });

  it('imagem que não é a cópia https do Cloudinary fica de fora (nada é pedido a outro site, nem ao Instagram)', () => {
    const base = { mediaType: 'IMAGE', caption: 'ok', permalink: 'https://www.instagram.com/p/AAA/', postedAt: '2026-11-01T12:00:00Z', isPinned: false, isVideo: false };
    const feed = readPublicInstagramFeed({
      username: 'x_producoeseventos',
      posts: [
        { ...base, id: 'ok', imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/x-producoes/instagram/1.jpg' },
        { ...base, id: 'cdn-ig', imageUrl: 'https://scontent.cdninstagram.com/v/t51/1.jpg' },
        { ...base, id: 'ig', imageUrl: 'https://www.instagram.com/p/AAA/media/' },
        { ...base, id: 'http', imageUrl: 'http://res.cloudinary.com/x/image/upload/1.jpg' },
        { ...base, id: 'falso', imageUrl: 'https://res.cloudinary.com.evil.example/x/1.jpg' },
        { ...base, id: 'relativo', imageUrl: '/x-producoes/instagram/1.jpg' },
      ],
    });
    expect(feed.posts.map((post) => post.id)).toEqual(['ok']);
  });

  it('resposta em outro formato vira lista vazia', () => {
    expect(readPublicInstagramFeed([]).posts).toEqual([]);
    expect(readPublicInstagramFeed(null).posts).toEqual([]);
    expect(readPublicInstagramFeed({ posts: 'x' }).posts).toEqual([]);
  });
});
