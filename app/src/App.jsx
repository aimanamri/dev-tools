import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/shell/AppShell'
import Home from './tools/Home'
import Placeholder from './tools/Placeholder'
import PasswordGenerator from './tools/PasswordGenerator'
import TimestampConverter from './tools/TimestampConverter'
import JSONFormatter from './tools/JSONFormatter'
import Base64Converter from './tools/Base64Converter'
import CronGenerator from './tools/CronGenerator'
import QRGenerator from './tools/QRGenerator'
import SVGConverter from './tools/SVGConverter'
import MarkdownPreview from './tools/MarkdownPreview'
import JSONConverters from './tools/JSONConverters'
import JSONTreeViewer from './tools/JSONTreeViewer'
import JSONDiff from './tools/JSONDiff'
import TimezoneConverter from './tools/TimezoneConverter'
import PythonDictConverter from './tools/PythonDictConverter'
import BlowfishTranspiler from './tools/BlowfishTranspiler'
import BlowfishArticleGenerator from './tools/BlowfishArticleGenerator'
import IPSubnetCalculator from './tools/IPSubnetCalculator'
import IPConversionTool from './tools/IPConversionTool'
import PDFToolSuite from './tools/PDFToolSuite'
import PDFSecurityTool from './tools/PDFSecurityTool'

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
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
