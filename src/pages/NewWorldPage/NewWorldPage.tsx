import React from 'react';
import { Box, Typography, Chip, Card, CardContent, Button, Stack } from '@mui/material';
import { SportsEsports } from '@mui/icons-material';
import { useWalletContext } from '../../context/WalletContext';
import { safeLocalStorage } from '../../utils/safeLocalStorage';
import { openExternal } from '../../utils/safeExternalLink';
import toast from 'react-hot-toast';

type GameInfo = {
  name: string;
  category: string;
  reason: string;
  url: string; // 官方网站
  background?: string; // 指定背景图（可选）；若为空则自动抓取 OG 图
};

const games: GameInfo[] = [
  { name: 'Axie Infinity', url: 'https://axieinfinity.com', category: 'Idle battle RPG (P2E)', reason: '现象级，DAU 百万' },
  { name: 'The Sandbox', url: 'https://www.sandbox.game', category: 'Voxel Metaverse (UGC)', reason: '土地 NFT 热销' },
  { name: 'Decentraland', url: 'https://decentraland.org', category: 'Social Virtual World', reason: '最早元宇宙' },
  { name: 'Illuvium', url: 'https://illuvium.io', category: 'Open-world / Autobattler', reason: '画质顶级' },
  { name: 'Alien Worlds', url: 'https://alienworlds.io', category: 'Metaverse Mining', reason: '简单上手' },
  { name: 'Gods Unchained', url: 'https://godsunchained.com', category: 'Trading Card Game', reason: 'Hearthstone 链上版' },
  { name: 'Star Atlas', url: 'https://play.staratlas.com', category: 'Grand Strategy Space MMO', reason: '科幻史诗' },
  { name: 'Big Time', url: 'https://www.bigtime.gg', category: 'Action RPG', reason: '画风电影级' },
  { name: 'Parallel', url: 'https://parallel.life', category: 'Sci‑Fi TCG', reason: '艺术级卡牌' },
  { name: 'Ember Sword', url: 'https://www.embersword.com', category: 'Cross‑platform Fantasy MMORPG', reason: '开放世界' },
  { name: 'My Neighbor Alice', url: 'https://myneighboralice.com', category: 'Multiplayer Farming / Social', reason: '女性向' },
  { name: 'Guild of Guardians', url: 'https://www.guildofguardians.com', category: 'Mobile RPG', reason: '手游化' },
  { name: 'Voxies', url: 'https://www.voxies.io', category: 'Turn‑based Tactical RPG', reason: '像素风' },
  { name: 'Aurory', url: 'https://aurory.io', category: 'Creature Collection RPG', reason: 'Solana 明星' },
  { name: 'PEGAXY', url: 'https://pegaxy.io', category: 'PvP Horse Racing (P2E)', reason: '赛马热' },
  { name: 'CryptoBlades', url: 'https://www.cryptoblades.io', category: 'Turn‑based RPG', reason: '经典回合制' },
  { name: 'Town Star', url: 'https://townstar.io', category: 'Strategic Farming Simulation', reason: 'Gala Games 出品' },
  { name: 'Mirandus', url: 'https://mirandus.game', category: 'Fantasy MMORPG', reason: '史诗级' },
  { name: 'Otherside', url: 'https://otherside.xyz', category: 'Immersive Metaverse', reason: 'Yuga Labs' },
  { name: 'Worldwide Webb', url: 'https://worldwidewebb.city', category: 'Pixel Metaverse MMORPG', reason: '社区驱动' },
];

const NewWorldPage: React.FC = () => {
  const { currentWallet } = useWalletContext();
  const [bgMap, setBgMap] = React.useState<Record<string, string>>({});
  const staticBackgrounds: Record<string, string> = React.useMemo(() => {
    // 预置的高分辨率背景（先用官方域名的高清 Logo，稳定、可用，尺寸提升到 512）
    const host = (u: string) => new URL(u).hostname.replace(/^www\./, '');
    const toLogo = (u: string) => `https://logo.clearbit.com/${host(u)}?size=512`;
    return {
      'Axie Infinity': toLogo('https://axieinfinity.com'),
      'The Sandbox': toLogo('https://www.sandbox.game'),
      'Decentraland': toLogo('https://decentraland.org'),
      'Illuvium': toLogo('https://illuvium.io'),
      'Alien Worlds': toLogo('https://alienworlds.io'),
      'Gods Unchained': toLogo('https://godsunchained.com'),
      'Star Atlas': toLogo('https://staratlas.com'),
      'Big Time': toLogo('https://www.bigtime.gg'),
      'Parallel': toLogo('https://parallel.life'),
      'Ember Sword': toLogo('https://www.embersword.com'),
      'My Neighbor Alice': toLogo('https://myneighboralice.com'),
      'Guild of Guardians': toLogo('https://www.guildofguardians.com'),
      'Voxies': toLogo('https://www.voxies.io'),
      'Aurory': toLogo('https://aurory.io'),
      'PEGAXY': toLogo('https://pegaxy.io'),
      'CryptoBlades': toLogo('https://www.cryptoblades.io'),
      'Town Star': toLogo('https://townstar.io'),
      'Mirandus': toLogo('https://mirandus.game'),
      'Otherside': toLogo('https://otherside.xyz'),
      'Worldwide Webb': toLogo('https://worldwidewebb.city'),
    };
  }, []);

  // 从官网抓取 OG 背景图（通过 r.jina.ai 代理以绕过 CORS/ORB 文本限制）
  React.useEffect(() => {
    let cancelled = false;
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tryLocalImage = async (g: GameInfo) => {
      try {
        const slug = slugify(g.name);
        const base = (process.env.PUBLIC_URL || '') + `/assets/games/${slug}`;
        const exts = ['jpg', 'png', 'webp'];
        for (const ext of exts) {
          const url = `${base}.${ext}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) return url;
        }
        return '';
      } catch {
        return '';
      }
    };
    const fetchOgImage = async (g: GameInfo) => {
      try {
        if (g.background) {
          return { name: g.name, url: g.background };
        }
        // 先尝试静态高清映射（不再做 HEAD 校验，避免跨域阻断）
        const preset = staticBackgrounds[g.name];
        if (preset) {
          return { name: g.name, url: preset };
        }
        // 优先使用你提供的本地静态图
        const local = await tryLocalImage(g);
        if (local) return { name: g.name, url: local };
        const u = new URL(g.url);
        // 使用 r.jina.ai 抓取网页文本（支持跨域），再解析 og:image
        const proxy = `https://r.jina.ai/http/${u.origin.replace(/^https?:\/\//, '')}`;
        const res = await fetch(proxy, { method: 'GET' });
        const html = await res.text();
        // 优先 twitter:image 以获得更高清的图，其次 og:image
        const ogMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i);
        let img = ogMatch?.[1] || '';
        if (img && !/^https?:\/\//i.test(img)) {
          img = u.origin.replace(/\/$/, '') + (img.startsWith('/') ? img : '/' + img);
        }
        // 作为回退，尝试 clearbit 高清 logo
        const root = u.hostname.replace(/^www\./, '').replace(/^play\./, '');
        const fallback = `https://logo.clearbit.com/${root}?size=512`;
        return { name: g.name, url: img || fallback };
      } catch {
        const u = new URL(g.url);
        const root = u.hostname.replace(/^www\./, '').replace(/^play\./, '');
        return { name: g.name, url: `https://logo.clearbit.com/${root}?size=512` };
      }
    };
    // 先用静态高清映射做“即刻可见”的预填充
    {
      const init: Record<string, string> = {};
      games.forEach(g => { if (staticBackgrounds[g.name]) init[g.name] = staticBackgrounds[g.name]; });
      setBgMap(prev => ({ ...init, ...prev }));
    }
    (async () => {
      const results = await Promise.all(games.map(fetchOgImage));
      if (!cancelled) {
        const map: Record<string, string> = {};
        results.forEach(r => { map[r.name] = r.url; });
        setBgMap(map);
      }
    })();
    return () => { cancelled = true; };
  }, [staticBackgrounds]);

  const bindingsKey = React.useMemo(() => 'game_bindings', []);
const [, setBindingsVersion] = React.useState(0);

const readBindings = React.useCallback((): Record<string, string[]> => {
  try {
    const raw = safeLocalStorage.getItem(bindingsKey) || '{}';
    const val = JSON.parse(raw);
    return typeof val === 'object' && val ? val : {};
  } catch {
    return {};
  }
}, [bindingsKey]);

  const isBound = (gameName: string) => {
  const wallet = currentWallet || 'demo_wallet';
  const map = readBindings();
  const arr = map[wallet] || [];
  return arr.includes(gameName);
};

  const bindGame = (gameName: string) => {
    if (!currentWallet) {
      toast.error('请先选择或创建钱包');
      return;
    }
    // 模拟签名绑定
    const wallet = currentWallet;
    const next = { ...readBindings() };
    const arr = new Set(next[wallet] || []);
    arr.add(gameName);
    next[wallet] = Array.from(arr);
    safeLocalStorage.setItem(bindingsKey, JSON.stringify(next));
    toast.success(`已绑定 ${gameName}（钱包：${wallet}）`);
    setBindingsVersion(v => v + 1);
  };
  const unbindGame = (gameName: string) => {
    if (!currentWallet) {
      toast.error('请先选择或创建钱包');
      return;
    }
    const wallet = currentWallet;
    const next = { ...readBindings() };
    const arr = new Set(next[wallet] || []);
    arr.delete(gameName);
    next[wallet] = Array.from(arr);
    safeLocalStorage.setItem(bindingsKey, JSON.stringify(next));
    toast.success(`已解除绑定 ${gameName}（钱包：${wallet}）`);
    setBindingsVersion(v => v + 1);
  };

  const handleUnbindClick = (gameName: string) => {
    const ok = window.confirm('是否要解除绑定？');
    if (ok) {
      unbindGame(gameName);
    }
  };

  const enterGame = (gameName: string) => {
    const wallet = currentWallet || 'guest';
    const url = `https://example.com/game?name=${encodeURIComponent(gameName)}&wallet=${encodeURIComponent(wallet)}&ts=${Date.now()}`;
    openExternal(url);
  };

  return (
  <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <SportsEsports sx={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #2EECCB 0%, #14B8A6 60%, #0F766E 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }} />
        <Typography variant="h4">新世界</Typography>
      </Stack>

      <Typography variant="h6" sx={{ mb: 1 }}>游戏大厅</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>点击卡片可绑定账户、预览资产并一键进入游戏</Typography>

      {/* 三列网格布局 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)'
        },
        gap: 2
      }}>
        {games.map((g) => {
          const host = (u: string) => new URL(u).hostname.replace(/^www\./, '').replace(/^play\./, '');
          const imgUrl = bgMap[g.name] || `https://logo.clearbit.com/${host(g.url)}?size=512`;
          return (
            <Card
              key={g.name}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(20,184,166,0.25)'
                },
                '&:hover .media': { transform: 'scale(1.06)' }
              }}
            >
              {/* 顶部背景图区域 */}
              <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                <Box
                  className="media"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    transition: 'transform 0.35s ease',
                    transform: 'scale(1)'
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.2) 100%)'
                }} />
                {/* 标题移至图片下方，移除悬停互动层 */}
              </Box>
              <CardContent>
                {/* 游戏标题与类别显示在图片下方 */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>{g.name}</Typography>
                  <Chip label={g.category} size="small" sx={{ fontWeight: 700, maxWidth: '100%' }} />
                </Stack>

                <Typography color="text.secondary" sx={{ mb: 2 }}>{g.reason}</Typography>

                {/* 三个操作按钮替代资产同步预览；强制同一排并缩小尺寸 */}
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'nowrap' }}>
                  {!isBound(g.name) ? (
                    <Button variant="contained" size="small" onClick={() => bindGame(g.name)} sx={{ minWidth: 0, px: 1.5, py: 0.5 }}>绑定账户</Button>
                  ) : (
                    <Chip label="已绑定" color="success" size="small" clickable onClick={() => handleUnbindClick(g.name)} sx={{ mr: 1 }} />
                  )}
                  <Button variant="outlined" size="small" onClick={() => enterGame(g.name)} sx={{ minWidth: 0, px: 1.5, py: 0.5 }}>进入游戏</Button>
                  <Button variant="text" size="small" onClick={() => openExternal(g.url)} sx={{ minWidth: 0, px: 1, py: 0.5 }}>官网</Button>
                </Stack>
              </CardContent>
              {/* 统一操作区域 */}
            </Card>
          );
        })}
      </Box>

      {/* 后续模块占位 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>任务中心（后续）</Typography>
        <Typography color="text.secondary">玩游戏赚空投（暂不开发，展示占位）。</Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>游戏内支付（后续）</Typography>
        <Typography color="text.secondary">钱包余额直接消费（暂不开发，展示占位）。</Typography>
      </Box>
    </Box>
  );
};

export default NewWorldPage;