import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import MenuIcon from '@mui/icons-material/Menu'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { createTheme, ThemeProvider } from '@mui/material/styles'

interface Post {
  slug: string
  title: string
  status: 'draft' | 'published'
}

type CmsRole = 'admin' | 'editor' | 'viewer'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f3b562' },
    background: { default: '#101820', paper: '#172631' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.04em' },
  },
})

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error ?? 'Request failed')
  return payload as T
}

function Login({ onLogin }: { onLogin: (role: CmsRole) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api<{ role: CmsRole }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      onLogin(result.role)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Card sx={{ width: 'min(100%, 430px)', background: 'linear-gradient(145deg, #1d3542, #172631)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Typography color="primary" variant="overline">PANDA / CONTENT CMS</Typography>
          <Typography variant="h3" sx={{ mt: 1, mb: 1 }}>Welcome back.</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Sign in to manage the content platform.
          </Typography>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required fullWidth />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

function Dashboard({ role, onLogout }: { role: CmsRole; onLogout: () => void }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [draftSlug, setDraftSlug] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  async function loadPosts() {
    setLoading(true)
    try {
      const result = await api<{ posts: Post[] }>('/api/admin/posts')
      setPosts(result.posts)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPosts() }, [])

  function selectPost(post: Post) {
    setSelectedSlug(post.slug)
    setDraftSlug(post.slug)
    setDraftTitle(post.title)
    setError('')
  }

  function startNewPost() {
    setSelectedSlug(null)
    setDraftSlug('')
    setDraftTitle('')
    setError('')
  }

  async function saveDraft() {
    try {
      const path = selectedSlug ? `/api/admin/posts/${encodeURIComponent(selectedSlug)}` : '/api/admin/posts'
      await api(path, {
        method: selectedSlug ? 'PUT' : 'POST',
        body: JSON.stringify({ slug: draftSlug, title: draftTitle }),
      })
      await loadPosts()
      setSelectedSlug(draftSlug.trim().toLowerCase())
      setDraftSlug(draftSlug.trim().toLowerCase())
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save draft')
    }
  }

  async function publish(slug: string) {
    try {
      await api(`/api/admin/posts/${encodeURIComponent(slug)}/publish`, { method: 'POST' })
      await loadPosts()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Unable to publish post')
    }
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' })
    onLogout()
  }

  const drawerWidth = 248
  const nav = (
    <Box sx={{ height: '100%', bgcolor: '#12212b', px: 2, py: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, mb: 5 }}>
        <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: '4px', transform: 'rotate(45deg)' }} />
        <Typography fontWeight={900} letterSpacing=".08em">PANDA CMS</Typography>
      </Stack>
      <Typography color="text.secondary" variant="caption" sx={{ px: 1 }}>WORKSPACE</Typography>
      <List sx={{ mt: 1 }}>
        {[
          { label: 'Overview', icon: <DashboardOutlinedIcon />, selected: true },
          { label: 'Posts', icon: <ArticleOutlinedIcon />, selected: false },
          { label: 'Drafts', icon: <DraftsOutlinedIcon />, selected: false },
          { label: 'Settings', icon: <SettingsOutlinedIcon />, selected: false },
        ].map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton selected={item.selected} onClick={() => setMobileNavOpen(false)} sx={{ borderRadius: 2, my: .25 }}>
              <ListItemIcon sx={{ minWidth: 38, color: item.selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 'auto', pt: 8, px: 1 }}>
        <Chip label={`${role} access`} size="small" color={role === 'viewer' ? 'default' : 'primary'} variant="outlined" />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="fixed" color="transparent" elevation={0} sx={{ display: { sm: 'none' }, backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <Toolbar><IconButton aria-label="Open navigation" color="inherit" edge="start" onClick={() => setMobileNavOpen(true)}><MenuIcon /></IconButton><Typography fontWeight={800} sx={{ ml: 2 }}>PANDA CMS</Typography></Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>{nav}</Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0 } }}>{nav}</Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ display: { xs: 'none', sm: 'block' }, backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Toolbar sx={{ justifyContent: 'flex-end' }}><Stack direction="row" spacing={2} alignItems="center"><Chip label={role} color={role === 'viewer' ? 'default' : 'primary'} size="small" /><Button color="inherit" onClick={logout}>Sign out</Button></Stack></Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ py: { xs: 10, sm: 5, md: 7 }, px: { xs: 2, sm: 4, md: 6 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} spacing={3} sx={{ mb: 5 }}>
            <Box><Typography color="primary" variant="overline">MONDAY, EDITORIAL WORKSPACE</Typography><Typography variant="h3" sx={{ mt: 1 }}>Good morning.</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>A quiet place to keep the public site moving.</Typography></Box>
            {role !== 'viewer' && <Button variant="contained" startIcon={<AddIcon />} onClick={startNewPost}>New draft</Button>}
          </Stack>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <MetricCard label="All posts" value={posts.length} detail="Across every state" icon={<ArticleOutlinedIcon />} />
            <MetricCard label="Published" value={posts.filter((post) => post.status === 'published').length} detail="Visible to readers" icon={<ArrowUpwardIcon />} accent="success.main" />
            <MetricCard label="Drafts" value={posts.filter((post) => post.status === 'draft').length} detail="Waiting for review" icon={<DraftsOutlinedIcon />} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: selectedSlug !== null || (role !== 'viewer' && draftSlug === '') ? 'minmax(0, 1.4fr) minmax(320px, .6fr)' : '1fr' }, gap: 3 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, border: '1px solid rgba(255,255,255,.08)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Box><Typography variant="h6" fontWeight={800}>Recent content</Typography><Typography color="text.secondary" variant="body2">Your editorial inventory</Typography></Box><Chip label={`${posts.length} total`} color="primary" variant="outlined" /></Stack>
              <Divider sx={{ mb: 1 }} />
              {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box> : posts.map((post) => <Stack key={post.slug} direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ py: 2, borderBottom: '1px solid rgba(255,255,255,.06)' }}><Box sx={{ minWidth: 0 }}><Button color="inherit" onClick={() => selectPost(post)} sx={{ p: 0, justifyContent: 'flex-start', textTransform: 'none', maxWidth: '100%' }}><Typography fontWeight={700} noWrap>{post.title}</Typography></Button><Typography color="text.secondary" variant="body2" noWrap>/{post.slug}</Typography></Box><Stack direction="row" spacing={1} alignItems="center" flexShrink={0}><Chip label={post.status} size="small" color={post.status === 'published' ? 'success' : 'default'} />{post.status === 'draft' && role !== 'viewer' && <Button size="small" variant="outlined" onClick={() => publish(post.slug)}>Publish</Button>}</Stack></Stack>)}
            </Paper>
            {role !== 'viewer' && (selectedSlug !== null || draftSlug === '') && <Card sx={{ border: '1px solid rgba(243,181,98,.35)', alignSelf: 'start' }}><CardContent><Typography color="primary" variant="overline">EDITORIAL ACTION</Typography><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{selectedSlug ? 'Edit draft' : 'New draft'}</Typography><Stack spacing={2}><TextField label="Slug" value={draftSlug} disabled={Boolean(selectedSlug)} onChange={(event) => setDraftSlug(event.target.value)} helperText="lowercase words separated by hyphens" /><TextField label="Title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} required multiline minRows={2} /><Button variant="contained" onClick={saveDraft}>{selectedSlug ? 'Save changes' : 'Create draft'}</Button></Stack></CardContent></Card>}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

function MetricCard({ label, value, detail, icon, accent = 'primary.main' }: { label: string; value: number; detail: string; icon: React.ReactNode; accent?: string }) {
  return <Card sx={{ border: '1px solid rgba(255,255,255,.08)', background: 'linear-gradient(145deg, rgba(29,53,66,.86), rgba(23,38,49,.86))' }}><CardContent><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h3" sx={{ mt: 1, fontSize: '2.25rem' }}>{value}</Typography><Typography color="text.secondary" variant="caption">{detail}</Typography></Box><Box sx={{ color: accent, opacity: .9 }}>{icon}</Box></Stack></CardContent></Card>
}

export default function App() {
  const [session, setSession] = useState<{ authenticated: boolean; role: CmsRole | null } | null>(null)

  useEffect(() => {
    api<{ authenticated: boolean; role: CmsRole | null }>('/api/admin/session')
      .then(setSession)
      .catch(() => setSession({ authenticated: false, role: null }))
  }, [])

  if (session === null) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>

  return <ThemeProvider theme={theme}><CssBaseline />{session.authenticated && session.role ? <Dashboard role={session.role} onLogout={() => setSession({ authenticated: false, role: null })} /> : <Login onLogin={(role) => setSession({ authenticated: true, role })} />}</ThemeProvider>
}
