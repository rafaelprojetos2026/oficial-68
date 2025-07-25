import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarDays, TrendingUp, Trophy, Calendar as CalendarIcon } from 'lucide-react';

interface MissaoData {
  data: string;
  concluido: boolean;
  total_pontos_dia: number;
  categoria_dia: string;
}

interface MissaoDetalhada {
  data: string;
  pontos: number;
  categoria: string;
  // Campos reais da tabela missao_dia
  missao_1_completa?: boolean;
  missao_2_completa?: boolean;
  missao_3_completa?: boolean;
  missao_4_completa?: boolean;
  missao_5_completa?: boolean;
  pontuacao_total?: number;
}

export const MissaoCalendario = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [missaoSelecionada, setMissaoSelecionada] = useState<MissaoDetalhada | null>(null);
  const [missoesDoMes, setMissoesDoMes] = useState<MissaoData[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMissoesDoMes(selectedDate);
    }
  }, [user, selectedDate]);

  const fetchMissoesDoMes = async (date: Date) => {
    if (!user) return;

    setLoading(true);
    try {
      const profile = await supabase.from('perfis').select('id').eq('user_id', user.id).single();
      if (profile.error) throw profile.error;

      const inicio = startOfMonth(date);
      const fim = endOfMonth(date);

      const { data, error } = await supabase
        .from('pontuacao_diaria')
        .select('data, total_pontos_dia, categoria_dia')
        .eq('user_id', profile.data.id)
        .gte('data', format(inicio, 'yyyy-MM-dd'))
        .lte('data', format(fim, 'yyyy-MM-dd'))
        .order('data');

      if (error) throw error;

      const missoesComStatus = data?.map(item => ({
        data: item.data,
        concluido: item.total_pontos_dia > 0,
        total_pontos_dia: item.total_pontos_dia || 0,
        categoria_dia: item.categoria_dia || 'baixa'
      })) || [];

      setMissoesDoMes(missoesComStatus);
    } catch (error) {
      console.error('Erro ao buscar missões do mês:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMissaoDetalhada = async (date: Date) => {
    if (!user) return;

    try {
      const profile = await supabase.from('perfis').select('id').eq('user_id', user.id).single();
      if (profile.error) throw profile.error;

      const dataFormatada = format(date, 'yyyy-MM-dd');

      // Buscar missão do dia
      const { data: missaoData, error: missaoError } = await supabase
        .from('missao_dia')
        .select('*')
        .eq('user_id', profile.data.id)
        .eq('data', dataFormatada)
        .single();

      // Buscar pontuação do dia
      const { data: pontuacaoData, error: pontuacaoError } = await supabase
        .from('pontuacao_diaria')
        .select('*')
        .eq('user_id', profile.data.id)
        .eq('data', dataFormatada)
        .single();

      if (missaoData || pontuacaoData) {
        const missaoDetalhada: MissaoDetalhada = {
          data: dataFormatada,
          pontos: pontuacaoData?.total_pontos_dia || 0,
          categoria: pontuacaoData?.categoria_dia || 'baixa',
          missao_1_completa: missaoData?.missao_1_completa || false,
          missao_2_completa: missaoData?.missao_2_completa || false,
          missao_3_completa: missaoData?.missao_3_completa || false,
          missao_4_completa: missaoData?.missao_4_completa || false,
          missao_5_completa: missaoData?.missao_5_completa || false,
          pontuacao_total: missaoData?.pontuacao_total || 0
        };

        setMissaoSelecionada(missaoDetalhada);
      } else {
        setMissaoSelecionada(null);
      }
    } catch (error) {
      console.error('Erro ao buscar missão detalhada:', error);
      setMissaoSelecionada(null);
    }
  };

  const getDayContent = (date: Date) => {
    const missaoDia = missoesDoMes.find(m => isSameDay(new Date(m.data), date));
    
    if (!missaoDia) return null;

    const getCategoriaColor = (categoria: string) => {
      switch (categoria) {
        case 'excelente': return 'bg-green-500';
        case 'medio': return 'bg-yellow-500';
        case 'baixa': return 'bg-red-500';
        default: return 'bg-gray-400';
      }
    };

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className={cn(
          "w-2 h-2 rounded-full absolute top-1 right-1",
          getCategoriaColor(missaoDia.categoria_dia)
        )} />
        {missaoDia.concluido && (
          <div className="text-xs font-bold text-green-600">✓</div>
        )}
      </div>
    );
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case 'excelente': return 'Excelente';
      case 'medio': return 'Bom';
      case 'baixa': return 'Iniciante';
      default: return 'Não avaliado';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'excelente': return 'bg-green-100 text-green-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'baixa': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-instituto-orange" />
            Histórico de Missões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                fetchMissaoDetalhada(date);
              }
            }}
            locale={ptBR}
            className={cn("w-full pointer-events-auto")}
            components={{
              DayContent: ({ date }) => (
                <div className="relative w-full h-full p-2">
                  <span>{date.getDate()}</span>
                  {getDayContent(date)}
                </div>
              )
            }}
            disabled={(date) => date > new Date()}
          />
          
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Legenda:</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Excelente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Bom</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Iniciante</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600 font-bold">✓</span>
                <span>Concluído</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes da Missão Selecionada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-instituto-orange" />
            Missão de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missaoSelecionada ? (
            <div className="space-y-4">
              {/* Resumo da pontuação */}
              <div className="flex items-center justify-between p-4 bg-instituto-orange/10 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-instituto-orange">
                    {missaoSelecionada.pontos} pontos
                  </div>
                  <Badge className={getCategoriaColor(missaoSelecionada.categoria)}>
                    {getCategoriaLabel(missaoSelecionada.categoria)}
                  </Badge>
                </div>
                <Trophy className="w-8 h-8 text-instituto-orange" />
              </div>

              {/* Detalhes das respostas */}
              <div className="space-y-3">
                <h4 className="font-medium">Status das Missões:</h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      missaoSelecionada.missao_1_completa ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span>Missão 1</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      missaoSelecionada.missao_2_completa ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span>Missão 2</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      missaoSelecionada.missao_3_completa ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span>Missão 3</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      missaoSelecionada.missao_4_completa ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span>Missão 4</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      missaoSelecionada.missao_5_completa ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <span>Missão 5</span>
                  </div>
                </div>
                
                <div className="text-sm mt-4">
                  <span className="font-medium">Pontuação total do dia:</span> {missaoSelecionada.pontuacao_total || 0} pontos
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhuma missão encontrada para esta data</p>
              <p className="text-sm">Selecione uma data onde você completou uma missão</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};