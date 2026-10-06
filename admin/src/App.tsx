import { useEffect, useMemo, useState } from 'react'
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
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuIcon from '@mui/icons-material/Menu'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { LineChart } from '@mui/x-charts/LineChart'

interface Post { slug: string; title: string; status: 'draft' | 'published' }
type CmsRole = 'admin' | 'editor' | 'viewer'

const theme = createTheme({ palette: { mode: 'dark', primary: { main: '#f3b562' }, background: { default: '#101820', paper: '#172631' } }, shape: { borderRadius: 14 }, typography: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', h3: { fontWeight: 800, letterSpacing: '-0.04em' } } })

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error ?? 'Request failed')
  return payload as T
}

function Login({ onLogin }: { onLogin: (role: CmsRole) => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { const result = await api<{ role: CmsRole }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }); onLogin(result.role) } catch (loginError) { setError(loginError instanceof Error ? loginError.message : 'Unable to sign in') } finally { setBusy(false) } }
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}><Card sx={{ width: 'min(100%, 430px)', background: 'linear-gradient(145deg, #1d3542, #172631)' }}><CardContent sx={{ p: { xs: 3, sm: 5 } }}><Typography color="primary" variant="overline">PANDA / CONTENT CMS</Typography><Typography variant="h3" sx={{ mt: 1, mb: 1 }}>Welcome back.</Typography><Typography color="text.secondary" sx={{ mb: 4 }}>Sign in to manage the content platform.</Typography><Box component="form" onSubmit={submit}><Stack spacing={2}><TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required fullWidth /><TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required fullWidth />{error && <Alert severity="error">{error}</Alert>}<Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}</Button></Stack></Box></CardContent></Card></Box>
}

function SideMenu({ role, onClose }: { role: CmsRole; onClose: () => void }) {
  const items = [{ label: 'Home', icon: <DashboardOutlinedIcon /> }, { label: 'Posts', icon: <ArticleOutlinedIcon /> }, { label: 'Drafts', icon: <DraftsOutlinedIcon /> }, { label: 'Settings', icon: <SettingsOutlinedIcon /> }]
  return <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', p: 2 }}><Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1, py: 1.5, mb: 3 }}><Box sx={{ width: 13, height: 13, bgcolor: 'primary.main', borderRadius: '4px', transform: 'rotate(45deg)' }} /><Typography fontWeight={900} letterSpacing=".08em">PANDA CMS</Typography></Stack><Typography color="text.secondary" variant="caption" sx={{ px: 1 }}>WORKSPACE</Typography><List sx={{ mt: 1 }}>{items.map((item, index) => <ListItem key={item.label} disablePadding><ListItemButton selected={index === 0} onClick={onClose} sx={{ borderRadius: 2, my: .25 }}><ListItemIcon sx={{ minWidth: 38, color: index === 0 ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon><ListItemText primary={item.label} /></ListItemButton></ListItem>)}</List><Box sx={{ mt: 'auto', p: 1 }}><Paper sx={{ p: 2, bgcolor: 'rgba(243,181,98,.09)', border: '1px solid rgba(243,181,98,.2)' }}><Typography variant="caption" color="primary">PANDA / ACCESS</Typography><Typography variant="body2" sx={{ mt: .5 }}>Signed in as {role}.</Typography></Paper></Box></Box>
}

function MetricCard({ label, value, detail, icon, color = 'primary.main' }: { label: string; value: number; detail: string; icon: React.ReactNode; color?: string }) { return <Card variant="outlined"><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>{value}</Typography><Typography color="text.secondary" variant="caption">{detail}</Typography></Box><Box sx={{ color, pt: .5 }}>{icon}</Box></Stack></CardContent></Card> }

function Dashboard({ role, onLogout }: { role: CmsRole; onLogout: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]); const [selectedSlug, setSelectedSlug] = useState<string | null>(null); const [draftSlug, setDraftSlug] = useState(''); const [draftTitle, setDraftTitle] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [mobileNavOpen, setMobileNavOpen] = useState(false)
  async function loadPosts() { setLoading(true); try { const result = await api<{ posts: Post[] }>('/api/admin/posts'); setPosts(result.posts) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load content') } finally { setLoading(false) } }
  useEffect(() => { void loadPosts() }, [])
  function selectPost(post: Post) { setSelectedSlug(post.slug); setDraftSlug(post.slug); setDraftTitle(post.title); setError('') }
  function startNewPost() { setSelectedSlug(null); setDraftSlug(''); setDraftTitle(''); setError('') }
  async function saveDraft() { try { const path = selectedSlug ? `/api/admin/posts/${encodeURIComponent(selectedSlug)}` : '/api/admin/posts'; await api(path, { method: selectedSlug ? 'PUT' : 'POST', body: JSON.stringify({ slug: draftSlug, title: draftTitle }) }); await loadPosts(); setSelectedSlug(draftSlug.trim().toLowerCase()); setDraftSlug(draftSlug.trim().toLowerCase()) } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save draft') } }
  async function publish(slug: string) { try { await api(`/api/admin/posts/${encodeURIComponent(slug)}/publish`, { method: 'POST' }); await loadPosts() } catch (publishError) { setError(publishError instanceof Error ? publishError.message : 'Unable to publish post') } }
  async function logout() { await api('/api/admin/logout', { method: 'POST' }); onLogout() }
  const publishedCount = posts.filter((post) => post.status === 'published').length; const draftCount = posts.filter((post) => post.status === 'draft').length; const columns: GridColDef[] = [{ field: 'title', headerName: 'Title', flex: 1, minWidth: 180 }, { field: 'slug', headerName: 'Slug', flex: 1, minWidth: 140 }, { field: 'status', headerName: 'Status', width: 130, renderCell: (params) => <Chip label={params.value} size="small" color={params.value === 'published' ? 'success' : 'default'} /> }]
  const nav = <SideMenu role={role} onClose={() => setMobileNavOpen(false)} />
  return <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}><Box component="nav" sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}><Drawer variant="temporary" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: '70dvw', boxSizing: 'border-box' } }}>{nav}</Drawer><Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', border: 0 } }}>{nav}</Drawer></Box><Box component="main" sx={{ flexGrow: 1, minWidth: 0, overflow: 'auto' }}><AppBar position="sticky" color="transparent" elevation={0} sx={{ display: { xs: 'none', md: 'block' }, backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}><Toolbar sx={{ justifyContent: 'space-between' }}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="body2" color="text.secondary">Dashboard</Typography><Typography color="text.secondary">/</Typography><Typography variant="body2">Home</Typography></Stack><Stack direction="row" spacing={1} alignItems="center"><TextField size="small" placeholder="Search" slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }} /><IconButton aria-label="Notifications" color="inherit"><NotificationsNoneRoundedIcon /></IconButton><Chip label={role} color={role === 'viewer' ? 'default' : 'primary'} size="small" /><Button color="inherit" onClick={logout}>Sign out</Button></Stack></Toolbar></AppBar><AppBar position="fixed" color="transparent" elevation={0} sx={{ display: { xs: 'block', md: 'none' }, backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}><Toolbar><IconButton aria-label="Open navigation" color="inherit" edge="start" onClick={() => setMobileNavOpen(true)}><MenuIcon /></IconButton><Typography fontWeight={800} sx={{ ml: 2 }}>Dashboard</Typography></Toolbar></AppBar><Container maxWidth={false} sx={{ maxWidth: 1700, mx: 'auto', mt: { xs: 8, md: 0 }, pb: 5, px: { xs: 2, md: 3 } }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ py: 4 }}><Box><Typography variant="h4" fontWeight={800}>Editorial overview</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>A live view of the content platform.</Typography></Box>{role !== 'viewer' && <Button variant="contained" startIcon={<AddIcon />} onClick={startNewPost}>New draft</Button>}</Stack>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}><MetricCard label="All posts" value={posts.length} detail="Current inventory" icon={<ArticleOutlinedIcon />} /><MetricCard label="Published" value={publishedCount} detail="Visible to readers" icon={<ArrowUpwardIcon />} color="success.main" /><MetricCard label="Drafts" value={draftCount} detail="Waiting for review" icon={<DraftsOutlinedIcon />} /><MetricCard label="Access" value={role === 'viewer' ? 0 : 1} detail={`${role} permissions`} icon={<DashboardOutlinedIcon />} /></Box><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}><Card variant="outlined"><CardContent><Typography variant="h6" fontWeight={800}>Publishing mix</Typography><Typography color="text.secondary" variant="body2">Current content status</Typography><Stack direction="row" justifyContent="space-between" sx={{ mt: 3, mb: 1 }}><Typography variant="body2">Published</Typography><Typography variant="body2">{posts.length ? Math.round((publishedCount / posts.length) * 100) : 0}%</Typography></Stack><LinearProgress variant="determinate" value={posts.length ? (publishedCount / posts.length) * 100 : 0} color="success" sx={{ height: 8, borderRadius: 4 }} /></CardContent></Card><Card variant="outlined"><CardContent><Typography variant="h6" fontWeight={800}>Content activity</Typography><Typography color="text.secondary" variant="body2">Current inventory snapshot</Typography><LineChart height={120} series={[{ data: posts.map((_, index) => posts.length - index), label: 'Posts' }]} xAxis={[{ scaleType: 'point', data: posts.map((post) => post.slug) }]} yAxis={[{}]} hideLegend grid={{ horizontal: true }} sx={{ mt: 1, '& .MuiLineElement-root': { stroke: '#f3b562', strokeWidth: 3 } }} /></CardContent></Card></Box><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Details</Typography><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: (selectedSlug !== null || (role !== 'viewer' && draftSlug === '')) ? 'minmax(0, 3fr) minmax(320px, 1fr)' : '1fr' }, gap: 2 }}><Paper sx={{ p: 1, border: '1px solid rgba(255,255,255,.08)' }}>{loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box> : <DataGrid autoHeight rows={posts.map((post) => ({ ...post, id: post.slug }))} columns={columns} disableRowSelectionOnClick hideFooterPagination density="compact" sx={{ border: 0, '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(255,255,255,.03)' } }} />}</Paper>{role !== 'viewer' && (selectedSlug !== null || draftSlug === '') && <Card variant="outlined" sx={{ alignSelf: 'start' }}><CardContent><Typography color="primary" variant="overline">EDITORIAL ACTION</Typography><Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{selectedSlug ? 'Edit draft' : 'New draft'}</Typography><Stack spacing={2}><TextField label="Slug" value={draftSlug} disabled={Boolean(selectedSlug)} onChange={(event) => setDraftSlug(event.target.value)} helperText="lowercase words separated by hyphens" /><TextField label="Title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} required multiline minRows={2} /><Button variant="contained" onClick={saveDraft}>{selectedSlug ? 'Save changes' : 'Create draft'}</Button></Stack></CardContent></Card>}</Box></Container></Box></Box>
}

export default function App() {
  const [session, setSession] = useState<{ authenticated: boolean; role: CmsRole | null } | null>(null)
  useEffect(() => { api<{ authenticated: boolean; role: CmsRole | null }>('/api/admin/session').then(setSession).catch(() => setSession({ authenticated: false, role: null })) }, [])
  if (session === null) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  return <ThemeProvider theme={theme}><CssBaseline />{session.authenticated && session.role ? <Dashboard role={session.role} onLogout={() => setSession({ authenticated: false, role: null })} /> : <Login onLogin={(role) => setSession({ authenticated: true, role })} />}</ThemeProvider>
}
