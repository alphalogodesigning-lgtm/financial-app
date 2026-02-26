import AppNav from '../../components/AppNav';

export default function ShellLayout({ children }) {
  return (
    <div className="shell-container">
      <AppNav />
      {children}
    </div>
  );
}
