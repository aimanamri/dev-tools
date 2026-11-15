import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/shell/AppShell'
import Home from './tools/Home'

// Each tool loads only when the user opens it.
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const PasswordGenerator = lazy(() => import('./tools/PasswordGenerator'))
const TimestampConverter = lazy(() => import('./tools/TimestampConverter'))
const JSONFormatter = lazy(() => import('./tools/JSONFormatter'))
const Base64Converter = lazy(() => import('./tools/Base64Converter'))
const CronGenerator = lazy(() => import('./tools/CronGenerator'))
const QRGenerator = lazy(() => import('./tools/QRGenerator'))
const SVGConverter = lazy(() => import('./tools/SVGConverter'))
const MarkdownPreview = lazy(() => import('./tools/MarkdownPreview'))
const JSONConverters = lazy(() => import('./tools/JSONConverters'))
const JSONTreeViewer = lazy(() => import('./tools/JSONTreeViewer'))
const JSONDiff = lazy(() => import('./tools/JSONDiff'))
const TimezoneConverter = lazy(() => import('./tools/TimezoneConverter'))
const PythonDictConverter = lazy(() => import('./tools/PythonDictConverter'))
const BlowfishTranspiler = lazy(() => import('./tools/BlowfishTranspiler'))
const BlowfishArticleGenerator = lazy(() => import('./tools/BlowfishArticleGenerator'))
const IPSubnetCalculator = lazy(() => import('./tools/IPSubnetCalculator'))
const IPConversionTool = lazy(() => import('./tools/IPConversionTool'))
const PDFToolSuite = lazy(() => import('./tools/PDFToolSuite'))
const PDFSecurityTool = lazy(() => import('./tools/PDFSecurityTool'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="/password"  element={<PasswordGenerator />} />
          <Route path="/timestamp" element={<TimestampConverter />} />
          <Route path="/json"      element={<JSONFormatter />} />
          <Route path="/base64"    element={<Base64Converter />} />
          <Route path="/cron"      element={<CronGenerator />} />
          <Route path="/qr"        element={<QRGenerator />} />
          <Route path="/svg"       element={<SVGConverter />} />
          <Route path="/markdown"      element={<MarkdownPreview />} />
          <Route path="/json-convert"  element={<JSONConverters />} />
          <Route path="/json-tree"     element={<JSONTreeViewer />} />
          <Route path="/json-diff"     element={<JSONDiff />} />
          <Route path="/timezone"      element={<TimezoneConverter />} />
          <Route path="/pydict"        element={<PythonDictConverter />} />
          <Route path="/blowfish"      element={<BlowfishTranspiler />} />
          <Route path="/blowfish-article" element={<BlowfishArticleGenerator />} />
          <Route path="/subnet"        element={<IPSubnetCalculator />} />
          <Route path="/ip-convert"   element={<IPConversionTool />} />
          <Route path="/pdf"           element={<PDFToolSuite />} />
          <Route path="/pdf-security"  element={<PDFSecurityTool />} />
          <Route path="/disclaimer"    element={<Disclaimer />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
