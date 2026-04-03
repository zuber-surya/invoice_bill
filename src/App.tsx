import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, where, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Invoice, Estimation, Party, Item, BusinessSettings, Employee, EmployeePayment, Expense, Equipment } from './types';
import { Layout } from './components/Layout';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceList } from './components/InvoiceList';
import { EstimationForm } from './components/EstimationForm';
import { EstimationList } from './components/EstimationList';
import { PartyManager } from './components/PartyManager';
import { ItemManager } from './components/ItemManager';
import { Settings } from './components/Settings';
import { EmployeeManager } from './components/EmployeeManager';
import { ExpenseManager } from './components/ExpenseManager';
import { EquipmentManager } from './components/EquipmentManager';
import { Dashboard } from './components/Dashboard';
import { LogIn, Loader2, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'create' | 'estimations' | 'create_estimation' | 'parties' | 'items' | 'employees' | 'expenses' | 'equipments' | 'settings'>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  const [conversionData, setConversionData] = useState<Partial<Invoice> | null>(null);
  const [estimationToEdit, setEstimationToEdit] = useState<Estimation | null>(null);

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qInvoices = query(collection(db, 'invoices'), where('isDeleted', '==', false), orderBy('createdAt', 'desc'));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    });

    const qEstimations = query(collection(db, 'estimations'), where('isDeleted', '==', false), orderBy('createdAt', 'desc'));
    const unsubEstimations = onSnapshot(qEstimations, (snapshot) => {
      setEstimations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimation)));
    });

    const unsubParties = onSnapshot(collection(db, 'parties'), (snapshot) => {
      setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Party)));
    });

    const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)));
    });

    const unsubEmployees = onSnapshot(query(collection(db, 'employees'), where('isDeleted', '==', false)), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const unsubEmployeePayments = onSnapshot(query(collection(db, 'employeePayments'), orderBy('date', 'desc')), (snapshot) => {
      setEmployeePayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeePayment)));
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });

    const unsubEquipments = onSnapshot(collection(db, 'equipments'), (snapshot) => {
      setEquipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as BusinessSettings);
      }
    });

    return () => {
      unsubInvoices();
      unsubEstimations();
      unsubParties();
      unsubItems();
      unsubEmployees();
      unsubEmployeePayments();
      unsubExpenses();
      unsubEquipments();
      unsubSettings();
    };
  }, [user]);

  const handleGoogleLogin = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login failed', error);
      let message = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        message = 'Google login is not enabled in Firebase Console. Please enable it.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = `This domain (${window.location.hostname}) is not authorized for Firebase Auth. Please add it to the "Authorized domains" in Firebase Console.`;
      }
      setAuthError(message || 'Google login failed. Please ensure Google provider is enabled in Firebase Console and this domain is authorized.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        message = 'This auth provider is not enabled in Firebase Console. Please enable Email/Password or Google provider.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = `This domain (${window.location.hostname}) is not authorized for Firebase Auth. Please add it to the "Authorized domains" in Firebase Console.`;
      }
      setAuthError(message);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">GST Invoice Pro</h1>
            <p className="text-sm text-gray-500">Compact, mobile-friendly GST management.</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
            Google
          </button>

          <p className="text-sm text-gray-500">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user} 
      onLogout={handleLogout}
      settings={settings}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          invoices={invoices} 
          estimations={estimations}
          expenses={expenses} 
          employeePayments={employeePayments}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === 'invoices' && (
        <InvoiceList 
          invoices={invoices} 
          onEdit={(inv) => { /* handle edit */ }} 
          onCreateNew={() => {
            setConversionData(null);
            setActiveTab('create');
          }}
        />
      )}
      {activeTab === 'create' && (
        <InvoiceForm 
          parties={parties} 
          items={items} 
          settings={settings}
          initialData={conversionData || undefined}
          onSuccess={() => {
            if (conversionData?.estimationId) {
              updateDoc(doc(db, 'estimations', conversionData.estimationId), { status: 'converted' });
            }
            setConversionData(null);
            setActiveTab('invoices');
          }}
        />
      )}
      {activeTab === 'estimations' && (
        <EstimationList 
          estimations={estimations}
          onEdit={(est) => {
            setEstimationToEdit(est);
            setActiveTab('create_estimation');
          }}
          onCreateNew={() => {
            setEstimationToEdit(null);
            setActiveTab('create_estimation');
          }}
          onConvert={(est) => {
            setConversionData({
              partyId: est.partyId,
              partyDetails: est.partyDetails,
              items: est.items,
              subtotal: est.subtotal,
              totalGst: est.totalGst,
              roundOff: est.roundOff,
              grandTotal: est.grandTotal,
              isInclusive: est.isInclusive,
              estimationId: est.id
            });
            setActiveTab('create');
          }}
        />
      )}
      {activeTab === 'create_estimation' && (
        <EstimationForm 
          parties={parties}
          items={items}
          settings={settings}
          initialData={estimationToEdit || undefined}
          onSuccess={() => {
            setEstimationToEdit(null);
            setActiveTab('estimations');
          }}
        />
      )}
      {activeTab === 'parties' && (
        <PartyManager parties={parties} invoices={invoices} />
      )}
      {activeTab === 'items' && (
        <ItemManager items={items} />
      )}
      {activeTab === 'employees' && (
        <EmployeeManager employees={employees} payments={employeePayments} settings={settings} />
      )}
      {activeTab === 'expenses' && (
        <ExpenseManager expenses={expenses} />
      )}
      {activeTab === 'equipments' && (
        <EquipmentManager equipments={equipments} />
      )}
      {activeTab === 'settings' && (
        <Settings settings={settings} />
      )}
    </Layout>
  );
}
