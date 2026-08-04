import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Route, Routes } from 'react-router-dom';
import Nav from './components/Nav.tsx';
import SignInScreen from './screens/SignInScreen.tsx';
import Dashboard from './screens/Dashboard.tsx';
import FearDetail from './screens/FearDetail.tsx';
import EntryForm from './screens/EntryForm.tsx';
import BibleVersions from './screens/BibleVersions.tsx';

export default function App() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Nav />
          <main
            style={{
              flex: 1,
              width: '100%',
              maxWidth: 1120,
              margin: '0 auto',
              padding: 'clamp(20px,4vw,44px) clamp(16px,4vw,40px) 80px',
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<EntryForm />} />
              <Route path="/fear/:id" element={<FearDetail />} />
              <Route path="/fear/:id/edit" element={<EntryForm />} />
              <Route path="/versions" element={<BibleVersions />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </SignedIn>
    </>
  );
}
