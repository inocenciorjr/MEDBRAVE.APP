export default function TestSSR() {
  console.log('[TEST SSR] Esta página foi renderizada no servidor!');
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Teste SSR</h1>
      <p>Se você está vendo isso, o SSR funcionou!</p>
      <p>Verifique o terminal do Next.js para ver o log.</p>
    </div>
  );
}
