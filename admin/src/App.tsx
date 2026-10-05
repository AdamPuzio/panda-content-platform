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
import Paper from '@mui/material/Paper'
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

function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      onLogin()
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

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <>
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 14, height: 14, bgcolor: 'primary.main', borderRadius: '50%' }} />
            <Typography fontWeight={800}>PANDA / CMS</Typography>
          </Stack>
          <Button color="inherit" onClick={logout}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={1} sx={{ mb: 5 }}>
          <Typography color="primary" variant="overline">EDITORIAL CONTROL ROOM</Typography>
          <Typography variant="h3">Content, composed.</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 650 }}>
            This admin surface is served by the CMS Express app and talks to authenticated Panda routes.
          </Typography>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        <Paper sx={{ p: { xs: 2, sm: 3 }, border: '1px solid rgba(255,255,255,.08)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Posts</Typography>
            <Chip label={`${posts.length} total`} color="primary" variant="outlined" />
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box> : posts.map((post) => (
            <Stack key={post.slug} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ py: 2, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <Box>
                <Typography fontWeight={700}>{post.title}</Typography>
                <Typography color="text.secondary" variant="body2">/{post.slug}</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={post.status} size="small" color={post.status === 'published' ? 'success' : 'default'} />
                {post.status === 'draft' && <Button size="small" variant="outlined" onClick={() => publish(post.slug)}>Publish</Button>}
              </Stack>
            </Stack>
          ))}
        </Paper>
      </Container>
    </>
  )
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    api<{ authenticated: boolean }>('/api/admin/session')
      .then(({ authenticated: value }) => setAuthenticated(value))
      .catch(() => setAuthenticated(false))
  }, [])

  if (authenticated === null) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>

  return <ThemeProvider theme={theme}><CssBaseline />{authenticated ? <Dashboard onLogout={() => setAuthenticated(false)} /> : <Login onLogin={() => setAuthenticated(true)} />}</ThemeProvider>
}
