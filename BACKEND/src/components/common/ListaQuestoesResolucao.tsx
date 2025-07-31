import React, { useEffect, useState } from 'react';

interface FiltroTag {
  nome: string;
  icone?: string;
}

interface Alternative {
  id: string;
  text: string;
}

interface Question {
  id: string;
  statement: string;
  alternatives: Alternative[];
  correctAlternativeId?: string;
  type?: string;
  isAnnulled?: boolean;
  isOutdated?: boolean;
  filterIds?: string[];
  subFilterIds?: string[];
  [key: string]: any;
}

interface ListaQuestoesResolucaoProps {
  listId?: string;
}

const API_BASE = '/api';

export const ListaQuestoesResolucao: React.FC<ListaQuestoesResolucaoProps> = ({ listId }) => {
  const [questoes, setQuestoes] = useState<Question[]>([]);
  const [filtrosInstitucionais, setFiltrosInstitucionais] = useState<FiltroTag[]>([]);
  const [filtrosEducacionais, setFiltrosEducacionais] = useState<FiltroTag[]>([]);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuestoesDaLista() {
      setLoading(true);
      const id = listId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('listId') : '') || '';
      const res = await fetch(`${API_BASE}/questions/lists/${id}/items`);
      const data: { data: any[] } = await res.json();
      const questoesDetalhadas: Question[] = await Promise.all(data.data.map(async (item: any) => {
        const qRes = await fetch(`${API_BASE}/questions/${item.questionId}`);
        const qData = await qRes.json();
        return { ...(typeof qData === 'object' && qData !== null ? qData : {}), order: item.order };
      }));
      questoesDetalhadas.sort((a, b) => a.order - b.order);
      setQuestoes(questoesDetalhadas);
      await fetchFiltrosReal(questoesDetalhadas);
      setLoading(false);
    }
    async function fetchFiltrosReal(questoes: Question[]) {
      const filterIdSet = new Set<string>();
      const subFilterIdSet = new Set<string>();
      questoes.forEach(q => {
        (q.filterIds || []).forEach(fid => filterIdSet.add(fid));
        (q.subFilterIds || []).forEach(sid => subFilterIdSet.add(sid));
      });
      const filtros = await Promise.all(Array.from(filterIdSet).map(async (fid) => {
        const res = await fetch(`${API_BASE}/filters/${fid}`);
        if (!res.ok) return null;
        return await res.json();
      }));
      const subfiltros = await Promise.all(Array.from(subFilterIdSet).map(async (sid) => {
        const res = await fetch(`${API_BASE}/filters/subfilters/${sid}`);
        if (!res.ok) return null;
        return await res.json();
      }));
      setFiltrosInstitucionais(
        filtros.filter((f: any) => f && typeof f === 'object' && 'category' in f && ["INSTITUTION","EXAM","ANO"].includes(f.category)).map((f: any) => ({ nome: f.name, icone: f.category === "INSTITUTION" ? "fa-university" : f.category === "ANO" ? "fa-file-alt" : "fa-building" }))
      );
      setFiltrosEducacionais([
        ...filtros.filter((f: any) => f && typeof f === 'object' && 'category' in f && ["AREA","TEMA","SUBTEMA"].includes(f.category)).map((f: any) => ({ nome: f.name, icone: f.category === "AREA" ? "fa-stethoscope" : undefined })),
        ...subfiltros.filter((sf: any) => sf && typeof sf === 'object').map((sf: any) => ({ nome: sf.name, icone: undefined }))
      ]);
    }
    fetchQuestoesDaLista();
  }, [listId]);

  function handleIrPara(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value);
    if (val >= 1 && val <= questoes.length) {
      setQuestaoAtual(val - 1);
    }
  }

  async function handleResponder(e: React.FormEvent<HTMLFormElement>, q: Question) {
    e.preventDefault();
    const alternativa = (e.currentTarget.elements.namedItem('alternativa') as HTMLInputElement)?.value;
    if (!alternativa) {
      if (typeof window !== 'undefined') window.alert('Selecione uma alternativa!');
      return;
    }
    const payload = {
      userId: 'USER_ID', // Troque pelo ID real do usuário logado
      questionId: q.id,
      selectedAlternativeId: alternativa,
      isCorrectOnFirstAttempt: alternativa === q.correctAlternativeId,
    };
    await fetch(`${API_BASE}/question-responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setQuestoes(prev => prev.map((quest, idx) => idx === questaoAtual ? { ...quest, responded: true, selected: alternativa } : quest));
  }

  function renderAlternativas(q: Question) {
    return q.alternatives.map((alt, i) => {
      let labelClass = 'flex items-center gap-3 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 relative alternativa';
      if (q.responded) {
        if (alt.id === q.correctAlternativeId) labelClass = labelClass.replace('bg-gray-50 border-gray-200', 'bg-green-50 border-green-200');
        else if (q.selected === alt.id) labelClass = labelClass.replace('bg-gray-50 border-gray-200', 'bg-red-50 border-red-200');
      }
      return (
        <label key={alt.id} className={labelClass}>
          <input type="radio" name="alternativa" value={alt.id} className="hidden" disabled={!!q.responded} defaultChecked={q.selected === alt.id} />
          <span className={`w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-300 text-gray-500 font-bold`}>{String.fromCharCode(65 + i)}</span>
          <span className="text-gray-700 texto-alternativa">{alt.text}</span>
          <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 riscar-btn" tabIndex={-1} title="Riscar alternativa" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            const label = (e.target as HTMLElement).closest('label');
            if (label) label.classList.toggle('riscada');
          }}><i className="fas fa-scissors"></i></button>
        </label>
      );
    });
  }

  if (loading) return <div className="text-center py-10">Carregando...</div>;
  if (!questoes.length) return <div className="text-center py-10">Nenhuma questão encontrada.</div>;
  const q = questoes[questaoAtual];
  const idx = questaoAtual + 1;
  const total = questoes.length;
  const tagsStatus = q.isAnnulled ? <span className="text-xs px-2 py-0.5 rounded bg-black text-white font-semibold flex items-center gap-1">Anulada</span> : null;
  const tagsDesatualizada = q.isOutdated ? <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold flex items-center gap-1">Desatualizada</span> : null;

  return (
    <div className="max-w-5xl mx-auto mt-10">
      {/* Filtros Institucionais */}
      <div className="flex flex-wrap gap-2 mb-2">
        {filtrosInstitucionais.map((f, i) => (
          <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold flex items-center">
            {f.icone && <i className={`fas ${f.icone} mr-1`}></i>} {f.nome}
          </span>
        ))}
      </div>
      {/* Filtros Educacionais */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filtrosEducacionais.map((f, i) => (
          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center">
            {f.icone && <i className={`fas ${f.icone} mr-1`}></i>}{f.nome}
          </span>
        ))}
      </div>
      {/* Ferramentas do Cabeçalho */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">Exibir:</label>
          <select className="rounded-xl border border-gray-200 px-2 py-1 text-xs" defaultValue="1 por vez" disabled>
            <option>1 por vez</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">Ir para:</label>
          <input type="number" min={1} max={total} className="w-14 rounded-xl border border-gray-200 px-2 py-1 text-xs" placeholder="Nº" onChange={handleIrPara} />
        </div>
        <div className="relative">
          <button className="flex items-center gap-2 text-xs bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 hover:bg-orange-50" disabled>
            <i className="fas fa-sort"></i> Organizar <i className="fas fa-chevron-down text-[10px]"></i>
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="text-gray-400 hover:text-orange-500" title="Aumentar fonte"><i className="fas fa-search-plus"></i></button>
          <button className="text-gray-400 hover:text-orange-500" title="Modo noturno"><i className="fas fa-moon"></i></button>
        </div>
      </div>
      {/* Card da Questão */}
      <div className="bg-white rounded-2xl shadow-lg p-12 mb-6">
        <div className="flex items-center mb-2 gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-mono">#{q.id}</span>
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">{q.type || 'Múltipla Escolha'}</span>
          {tagsStatus}
          {tagsDesatualizada}
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold flex items-center gap-1">Questão {idx} de {total}</span>
        </div>
        <h2 className="text-lg font-semibold mb-6 text-gray-800">{q.statement}</h2>
        <form onSubmit={e => handleResponder(e, q)}>
          <div className="space-y-3 mb-6">{renderAlternativas(q)}</div>
          <div className="flex gap-3 mb-2">
            <button type="button" className="text-gray-400 hover:text-orange-500" title="Favoritar"><i className="far fa-bookmark"></i></button>
            <button type="button" className="text-gray-400 hover:text-orange-500" title="Denunciar"><i className="fas fa-flag"></i></button>
            <button type="button" className="text-gray-400 hover:text-orange-500" title="Compartilhar"><i className="fas fa-share-alt"></i></button>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl flex items-center gap-2"><i className="fas fa-book-open"></i> Resumo do Tema</button>
                <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl flex items-center gap-2"><i className="fas fa-comments"></i> Comentários</button>
          </div>
          <div className="mt-6">
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl" disabled={!!q.responded}>Responder</button>
          </div>
        </form>
      </div>
      {/* Navegação */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 bg-white hover:bg-orange-50" onClick={() => setQuestaoAtual(Math.max(questaoAtual - 1, 0))} disabled={questaoAtual === 0}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="text-xs text-gray-500">Pág. <b>{idx}</b> de {total}</span>
        </div>
        <button className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center text-2xl shadow-lg" onClick={() => setQuestaoAtual(Math.min(questaoAtual + 1, total - 1))} disabled={questaoAtual === total - 1}>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};