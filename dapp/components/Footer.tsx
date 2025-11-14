const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="py-8 px-4 border-t border-border">
      <div className="container mx-auto text-center text-sm text-muted-foreground">
        <p>© {year} ChainInvoice. Built on Sui Blockchain.</p>
      </div>
    </footer>
  );
};

export default Footer;
