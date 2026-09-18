export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acompanhamentos: {
        Row: {
          aderencia_plano: number | null
          circunferencia_abdominal: number | null
          circunferencia_quadril: number | null
          created_at: string
          data_registro: string
          foto_url: string | null
          id: string
          nivel_energia: number | null
          observacoes_nutricionista: string | null
          observacoes_paciente: string | null
          paciente_id: string
          peso: number | null
          qualidade_sono: number | null
          user_id: string
        }
        Insert: {
          aderencia_plano?: number | null
          circunferencia_abdominal?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_registro?: string
          foto_url?: string | null
          id?: string
          nivel_energia?: number | null
          observacoes_nutricionista?: string | null
          observacoes_paciente?: string | null
          paciente_id: string
          peso?: number | null
          qualidade_sono?: number | null
          user_id: string
        }
        Update: {
          aderencia_plano?: number | null
          circunferencia_abdominal?: number | null
          circunferencia_quadril?: number | null
          created_at?: string
          data_registro?: string
          foto_url?: string | null
          id?: string
          nivel_energia?: number | null
          observacoes_nutricionista?: string | null
          observacoes_paciente?: string | null
          paciente_id?: string
          peso?: number | null
          qualidade_sono?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      alimento_substituicoes: {
        Row: {
          alimento_plano_id: string
          alimento_taco_id: number | null
          created_at: string
          id: string
          medida_caseira: string | null
          nome: string
          ordem: number
          quantidade: number | null
        }
        Insert: {
          alimento_plano_id: string
          alimento_taco_id?: number | null
          created_at?: string
          id?: string
          medida_caseira?: string | null
          nome: string
          ordem?: number
          quantidade?: number | null
        }
        Update: {
          alimento_plano_id?: string
          alimento_taco_id?: number | null
          created_at?: string
          id?: string
          medida_caseira?: string | null
          nome?: string
          ordem?: number
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alimento_substituicoes_alimento_plano_id_fkey"
            columns: ["alimento_plano_id"]
            isOneToOne: false
            referencedRelation: "alimentos_plano"
            referencedColumns: ["id"]
          },
        ]
      }
      alimentos_personalizados: {
        Row: {
          carboidrato_g: number
          created_at: string
          energia_kcal: number
          fibra_g: number
          grupo: Database["public"]["Enums"]["grupo_alimentar"]
          id: string
          lipidio_g: number
          medida_caseira: string | null
          nome: string
          proteina_g: number
          quantidade_base: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carboidrato_g?: number
          created_at?: string
          energia_kcal?: number
          fibra_g?: number
          grupo?: Database["public"]["Enums"]["grupo_alimentar"]
          id?: string
          lipidio_g?: number
          medida_caseira?: string | null
          nome: string
          proteina_g?: number
          quantidade_base?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carboidrato_g?: number
          created_at?: string
          energia_kcal?: number
          fibra_g?: number
          grupo?: Database["public"]["Enums"]["grupo_alimentar"]
          id?: string
          lipidio_g?: number
          medida_caseira?: string | null
          nome?: string
          proteina_g?: number
          quantidade_base?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alimentos_plano: {
        Row: {
          alimento_taco_id: number | null
          carboidrato_g: number | null
          created_at: string
          energia_kcal: number | null
          fibra_g: number | null
          id: string
          lipidio_g: number | null
          medida_caseira: string | null
          nome_alimento: string
          opcao: string
          ordem: number
          precisa_revisao: boolean
          proteina_g: number | null
          quantidade: number | null
          refeicao_id: string
        }
        Insert: {
          alimento_taco_id?: number | null
          carboidrato_g?: number | null
          created_at?: string
          energia_kcal?: number | null
          fibra_g?: number | null
          id?: string
          lipidio_g?: number | null
          medida_caseira?: string | null
          nome_alimento: string
          opcao?: string
          ordem?: number
          precisa_revisao?: boolean
          proteina_g?: number | null
          quantidade?: number | null
          refeicao_id: string
        }
        Update: {
          alimento_taco_id?: number | null
          carboidrato_g?: number | null
          created_at?: string
          energia_kcal?: number | null
          fibra_g?: number | null
          id?: string
          lipidio_g?: number | null
          medida_caseira?: string | null
          nome_alimento?: string
          opcao?: string
          ordem?: number
          precisa_revisao?: boolean
          proteina_g?: number | null
          quantidade?: number | null
          refeicao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alimentos_plano_alimento_taco_id_fkey"
            columns: ["alimento_taco_id"]
            isOneToOne: false
            referencedRelation: "alimentos_taco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alimentos_plano_refeicao_id_fkey"
            columns: ["refeicao_id"]
            isOneToOne: false
            referencedRelation: "refeicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      alimentos_taco: {
        Row: {
          carboidrato_g: number | null
          energia_kcal: number | null
          fibra_g: number | null
          grupo: Database["public"]["Enums"]["grupo_alimentar"] | null
          id: number
          lipidio_g: number | null
          nome: string
          numero: number | null
          palavras_chave: string[] | null
          proteina_g: number | null
        }
        Insert: {
          carboidrato_g?: number | null
          energia_kcal?: number | null
          fibra_g?: number | null
          grupo?: Database["public"]["Enums"]["grupo_alimentar"] | null
          id?: number
          lipidio_g?: number | null
          nome: string
          numero?: number | null
          palavras_chave?: string[] | null
          proteina_g?: number | null
        }
        Update: {
          carboidrato_g?: number | null
          energia_kcal?: number | null
          fibra_g?: number | null
          grupo?: Database["public"]["Enums"]["grupo_alimentar"] | null
          id?: number
          lipidio_g?: number | null
          nome?: string
          numero?: number | null
          palavras_chave?: string[] | null
          proteina_g?: number | null
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          created_at: string
          espaco_livre: string | null
          historico_alimentar: string | null
          historico_medico: string | null
          historico_treino: string | null
          id: string
          objetivos_motivacoes: string | null
          paciente_id: string
          preenchido_por: Database["public"]["Enums"]["preenchido_por"]
          respondido: boolean
          saude_intestinal: string | null
          sono_estresse: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          espaco_livre?: string | null
          historico_alimentar?: string | null
          historico_medico?: string | null
          historico_treino?: string | null
          id?: string
          objetivos_motivacoes?: string | null
          paciente_id: string
          preenchido_por?: Database["public"]["Enums"]["preenchido_por"]
          respondido?: boolean
          saude_intestinal?: string | null
          sono_estresse?: string | null
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          espaco_livre?: string | null
          historico_alimentar?: string | null
          historico_medico?: string | null
          historico_treino?: string | null
          id?: string
          objetivos_motivacoes?: string | null
          paciente_id?: string
          preenchido_por?: Database["public"]["Enums"]["preenchido_por"]
          respondido?: boolean
          saude_intestinal?: string | null
          sono_estresse?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: string | null
          id: string
          ip_address: string | null
          referencia_id: string | null
          tipo: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: string | null
          id?: string
          ip_address?: string | null
          referencia_id?: string | null
          tipo?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: string | null
          id?: string
          ip_address?: string | null
          referencia_id?: string | null
          tipo?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      avaliacoes_fisicas: {
        Row: {
          altura: number | null
          altura_joelho: number | null
          altura_sentado: number | null
          bio_agua_corporal: number | null
          bio_gordura_visceral: number | null
          bio_idade_metabolica: number | null
          bio_massa_gorda: number | null
          bio_massa_livre_gordura: number | null
          bio_massa_muscular: number | null
          bio_metabolismo_basal: number | null
          bio_percentual_gordura: number | null
          bio_percentual_ideal: number | null
          bio_percentual_massa_muscular: number | null
          bio_peso_osseo: number | null
          circ_abdomen: number | null
          circ_antebraco: number | null
          circ_antebraco_dir: number | null
          circ_antebraco_esq: number | null
          circ_braco_contraido: number | null
          circ_braco_contraido_dir: number | null
          circ_braco_contraido_esq: number | null
          circ_braco_dir: number | null
          circ_braco_esq: number | null
          circ_cintura: number | null
          circ_coxa_dir: number | null
          circ_coxa_distal: number | null
          circ_coxa_distal_dir: number | null
          circ_coxa_distal_esq: number | null
          circ_coxa_esq: number | null
          circ_coxa_medial: number | null
          circ_coxa_medial_dir: number | null
          circ_coxa_medial_esq: number | null
          circ_coxa_proximal: number | null
          circ_coxa_proximal_dir: number | null
          circ_coxa_proximal_esq: number | null
          circ_ombro: number | null
          circ_panturrilha: number | null
          circ_panturrilha_dir: number | null
          circ_panturrilha_esq: number | null
          circ_pescoco: number | null
          circ_quadril: number | null
          circ_torax: number | null
          classificacao_imc: string | null
          created_at: string
          data_avaliacao: string
          diam_biacromial: number | null
          diam_bicrista: number | null
          diam_femur: number | null
          diam_punho: number | null
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_biceps: number | null
          dobra_coxa: number | null
          dobra_panturrilha: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_supraespinhal: number | null
          dobra_suprailiaca: number | null
          dobra_toracica: number | null
          dobra_triceps: number | null
          envergadura: number | null
          id: string
          imc: number | null
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          observacoes: string | null
          origem: string
          paciente_id: string
          pdf_origem_nome: string | null
          pdf_origem_url: string | null
          percentual_gordura_dobras: number | null
          peso: number | null
          protocolo_dobras: string | null
          relacao_cintura_quadril: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          altura?: number | null
          altura_joelho?: number | null
          altura_sentado?: number | null
          bio_agua_corporal?: number | null
          bio_gordura_visceral?: number | null
          bio_idade_metabolica?: number | null
          bio_massa_gorda?: number | null
          bio_massa_livre_gordura?: number | null
          bio_massa_muscular?: number | null
          bio_metabolismo_basal?: number | null
          bio_percentual_gordura?: number | null
          bio_percentual_ideal?: number | null
          bio_percentual_massa_muscular?: number | null
          bio_peso_osseo?: number | null
          circ_abdomen?: number | null
          circ_antebraco?: number | null
          circ_antebraco_dir?: number | null
          circ_antebraco_esq?: number | null
          circ_braco_contraido?: number | null
          circ_braco_contraido_dir?: number | null
          circ_braco_contraido_esq?: number | null
          circ_braco_dir?: number | null
          circ_braco_esq?: number | null
          circ_cintura?: number | null
          circ_coxa_dir?: number | null
          circ_coxa_distal?: number | null
          circ_coxa_distal_dir?: number | null
          circ_coxa_distal_esq?: number | null
          circ_coxa_esq?: number | null
          circ_coxa_medial?: number | null
          circ_coxa_medial_dir?: number | null
          circ_coxa_medial_esq?: number | null
          circ_coxa_proximal?: number | null
          circ_coxa_proximal_dir?: number | null
          circ_coxa_proximal_esq?: number | null
          circ_ombro?: number | null
          circ_panturrilha?: number | null
          circ_panturrilha_dir?: number | null
          circ_panturrilha_esq?: number | null
          circ_pescoco?: number | null
          circ_quadril?: number | null
          circ_torax?: number | null
          classificacao_imc?: string | null
          created_at?: string
          data_avaliacao?: string
          diam_biacromial?: number | null
          diam_bicrista?: number | null
          diam_femur?: number | null
          diam_punho?: number | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_biceps?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_supraespinhal?: number | null
          dobra_suprailiaca?: number | null
          dobra_toracica?: number | null
          dobra_triceps?: number | null
          envergadura?: number | null
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          origem?: string
          paciente_id: string
          pdf_origem_nome?: string | null
          pdf_origem_url?: string | null
          percentual_gordura_dobras?: number | null
          peso?: number | null
          protocolo_dobras?: string | null
          relacao_cintura_quadril?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          altura?: number | null
          altura_joelho?: number | null
          altura_sentado?: number | null
          bio_agua_corporal?: number | null
          bio_gordura_visceral?: number | null
          bio_idade_metabolica?: number | null
          bio_massa_gorda?: number | null
          bio_massa_livre_gordura?: number | null
          bio_massa_muscular?: number | null
          bio_metabolismo_basal?: number | null
          bio_percentual_gordura?: number | null
          bio_percentual_ideal?: number | null
          bio_percentual_massa_muscular?: number | null
          bio_peso_osseo?: number | null
          circ_abdomen?: number | null
          circ_antebraco?: number | null
          circ_antebraco_dir?: number | null
          circ_antebraco_esq?: number | null
          circ_braco_contraido?: number | null
          circ_braco_contraido_dir?: number | null
          circ_braco_contraido_esq?: number | null
          circ_braco_dir?: number | null
          circ_braco_esq?: number | null
          circ_cintura?: number | null
          circ_coxa_dir?: number | null
          circ_coxa_distal?: number | null
          circ_coxa_distal_dir?: number | null
          circ_coxa_distal_esq?: number | null
          circ_coxa_esq?: number | null
          circ_coxa_medial?: number | null
          circ_coxa_medial_dir?: number | null
          circ_coxa_medial_esq?: number | null
          circ_coxa_proximal?: number | null
          circ_coxa_proximal_dir?: number | null
          circ_coxa_proximal_esq?: number | null
          circ_ombro?: number | null
          circ_panturrilha?: number | null
          circ_panturrilha_dir?: number | null
          circ_panturrilha_esq?: number | null
          circ_pescoco?: number | null
          circ_quadril?: number | null
          circ_torax?: number | null
          classificacao_imc?: string | null
          created_at?: string
          data_avaliacao?: string
          diam_biacromial?: number | null
          diam_bicrista?: number | null
          diam_femur?: number | null
          diam_punho?: number | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_biceps?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_supraespinhal?: number | null
          dobra_suprailiaca?: number | null
          dobra_toracica?: number | null
          dobra_triceps?: number | null
          envergadura?: number | null
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          origem?: string
          paciente_id?: string
          pdf_origem_nome?: string | null
          pdf_origem_url?: string | null
          percentual_gordura_dobras?: number | null
          peso?: number | null
          protocolo_dobras?: string | null
          relacao_cintura_quadril?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      calculos_energeticos: {
        Row: {
          adicional_gestante: boolean | null
          adicional_met: number | null
          altura: number | null
          carboidrato_g: number | null
          carboidrato_pct: number | null
          created_at: string
          distribuicao_refeicoes: Json | null
          fator_atividade: number | null
          fator_injuria: number | null
          formula: string | null
          get: number | null
          gordura_g: number | null
          gordura_pct: number | null
          id: string
          idade: number | null
          massa_magra: number | null
          meta_calorica: number | null
          objetivo: string | null
          paciente_id: string
          percentual_ajuste: number | null
          peso: number | null
          proteina_g: number | null
          proteina_pct: number | null
          sexo: string | null
          tmb: number | null
          trimestre_gestante: number | null
          user_id: string
        }
        Insert: {
          adicional_gestante?: boolean | null
          adicional_met?: number | null
          altura?: number | null
          carboidrato_g?: number | null
          carboidrato_pct?: number | null
          created_at?: string
          distribuicao_refeicoes?: Json | null
          fator_atividade?: number | null
          fator_injuria?: number | null
          formula?: string | null
          get?: number | null
          gordura_g?: number | null
          gordura_pct?: number | null
          id?: string
          idade?: number | null
          massa_magra?: number | null
          meta_calorica?: number | null
          objetivo?: string | null
          paciente_id: string
          percentual_ajuste?: number | null
          peso?: number | null
          proteina_g?: number | null
          proteina_pct?: number | null
          sexo?: string | null
          tmb?: number | null
          trimestre_gestante?: number | null
          user_id: string
        }
        Update: {
          adicional_gestante?: boolean | null
          adicional_met?: number | null
          altura?: number | null
          carboidrato_g?: number | null
          carboidrato_pct?: number | null
          created_at?: string
          distribuicao_refeicoes?: Json | null
          fator_atividade?: number | null
          fator_injuria?: number | null
          formula?: string | null
          get?: number | null
          gordura_g?: number | null
          gordura_pct?: number | null
          id?: string
          idade?: number | null
          massa_magra?: number | null
          meta_calorica?: number | null
          objetivo?: string | null
          paciente_id?: string
          percentual_ajuste?: number | null
          peso?: number | null
          proteina_g?: number | null
          proteina_pct?: number | null
          sexo?: string | null
          tmb?: number | null
          trimestre_gestante?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculos_energeticos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_respostas: {
        Row: {
          aderencia_plano: number | null
          created_at: string
          id: string
          nivel_energia: number | null
          observacoes: string | null
          paciente_id: string
          peso: number | null
          qualidade_sono: number | null
          respondido: boolean | null
          semana: string
          token: string
        }
        Insert: {
          aderencia_plano?: number | null
          created_at?: string
          id?: string
          nivel_energia?: number | null
          observacoes?: string | null
          paciente_id: string
          peso?: number | null
          qualidade_sono?: number | null
          respondido?: boolean | null
          semana?: string
          token?: string
        }
        Update: {
          aderencia_plano?: number | null
          created_at?: string
          id?: string
          nivel_energia?: number | null
          observacoes?: string | null
          paciente_id?: string
          peso?: number | null
          qualidade_sono?: number | null
          respondido?: boolean | null
          semana?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_respostas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_clinica: {
        Row: {
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          crn: string | null
          dias_alerta_vencimento: number
          email_resposta: string | null
          endereco: string | null
          facebook: string | null
          id: string
          incluir_capa: boolean | null
          instagram: string | null
          logo_url: string | null
          marca_dagua: boolean | null
          mensagem_boas_vindas: string | null
          nome_clinica: string | null
          site: string | null
          smtp_ativo: boolean | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          crn?: string | null
          dias_alerta_vencimento?: number
          email_resposta?: string | null
          endereco?: string | null
          facebook?: string | null
          id?: string
          incluir_capa?: boolean | null
          instagram?: string | null
          logo_url?: string | null
          marca_dagua?: boolean | null
          mensagem_boas_vindas?: string | null
          nome_clinica?: string | null
          site?: string | null
          smtp_ativo?: boolean | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          crn?: string | null
          dias_alerta_vencimento?: number
          email_resposta?: string | null
          endereco?: string | null
          facebook?: string | null
          id?: string
          incluir_capa?: boolean | null
          instagram?: string | null
          logo_url?: string | null
          marca_dagua?: boolean | null
          mensagem_boas_vindas?: string | null
          nome_clinica?: string | null
          site?: string | null
          smtp_ativo?: boolean | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_usuarios: {
        Row: {
          created_at: string
          enviar_email_boas_vindas: boolean
          equipe_pode_criar_acessos: boolean
          equipe_pode_criar_pacientes: boolean
          expiracao_sessao_admin: number
          expiracao_sessao_equipe: number
          expiracao_sessao_paciente: number
          forcar_troca_senha: boolean
          id: string
          tempo_bloqueio: number
          tentativas_login: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enviar_email_boas_vindas?: boolean
          equipe_pode_criar_acessos?: boolean
          equipe_pode_criar_pacientes?: boolean
          expiracao_sessao_admin?: number
          expiracao_sessao_equipe?: number
          expiracao_sessao_paciente?: number
          forcar_troca_senha?: boolean
          id?: string
          tempo_bloqueio?: number
          tentativas_login?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enviar_email_boas_vindas?: boolean
          equipe_pode_criar_acessos?: boolean
          equipe_pode_criar_pacientes?: boolean
          expiracao_sessao_admin?: number
          expiracao_sessao_equipe?: number
          expiracao_sessao_paciente?: number
          forcar_troca_senha?: boolean
          id?: string
          tempo_bloqueio?: number
          tentativas_login?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consultas: {
        Row: {
          anotacoes: string | null
          created_at: string
          data_hora: string
          id: string
          paciente_id: string
          status: Database["public"]["Enums"]["status_consulta"] | null
          tipo: Database["public"]["Enums"]["tipo_consulta"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anotacoes?: string | null
          created_at?: string
          data_hora: string
          id?: string
          paciente_id: string
          status?: Database["public"]["Enums"]["status_consulta"] | null
          tipo?: Database["public"]["Enums"]["tipo_consulta"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anotacoes?: string | null
          created_at?: string
          data_hora?: string
          id?: string
          paciente_id?: string
          status?: Database["public"]["Enums"]["status_consulta"] | null
          tipo?: Database["public"]["Enums"]["tipo_consulta"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_favoritos: {
        Row: {
          conteudo_id: string
          created_at: string
          id: string
          paciente_id: string
        }
        Insert: {
          conteudo_id: string
          created_at?: string
          id?: string
          paciente_id: string
        }
        Update: {
          conteudo_id?: string
          created_at?: string
          id?: string
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_favoritos_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos_real"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_favoritos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_liberacoes: {
        Row: {
          conteudo_id: string
          created_at: string
          id: string
          liberado: boolean | null
          paciente_id: string
        }
        Insert: {
          conteudo_id: string
          created_at?: string
          id?: string
          liberado?: boolean | null
          paciente_id: string
        }
        Update: {
          conteudo_id?: string
          created_at?: string
          id?: string
          liberado?: boolean | null
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_liberacoes_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos_real"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_liberacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_visualizacoes: {
        Row: {
          conteudo_id: string
          created_at: string
          id: string
          paciente_id: string
          visto: boolean | null
          visto_em: string | null
        }
        Insert: {
          conteudo_id: string
          created_at?: string
          id?: string
          paciente_id: string
          visto?: boolean | null
          visto_em?: string | null
        }
        Update: {
          conteudo_id?: string
          created_at?: string
          id?: string
          paciente_id?: string
          visto?: boolean | null
          visto_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_visualizacoes_conteudo_id_fkey"
            columns: ["conteudo_id"]
            isOneToOne: false
            referencedRelation: "conteudos_real"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conteudo_visualizacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudos_real: {
        Row: {
          arquivo_path: string | null
          categoria: Database["public"]["Enums"]["categoria_conteudo"]
          conteudo_texto: string | null
          created_at: string
          descricao: string | null
          duracao_estimada: string | null
          fase: string
          id: string
          obrigatorio: boolean | null
          ordem: number | null
          status: Database["public"]["Enums"]["status_conteudo"]
          tags: string[] | null
          thumbnail_url: string | null
          tipo: Database["public"]["Enums"]["tipo_conteudo"]
          titulo: string
          updated_at: string
          url_midia: string | null
          user_id: string
        }
        Insert: {
          arquivo_path?: string | null
          categoria?: Database["public"]["Enums"]["categoria_conteudo"]
          conteudo_texto?: string | null
          created_at?: string
          descricao?: string | null
          duracao_estimada?: string | null
          fase?: string
          id?: string
          obrigatorio?: boolean | null
          ordem?: number | null
          status?: Database["public"]["Enums"]["status_conteudo"]
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo?: Database["public"]["Enums"]["tipo_conteudo"]
          titulo: string
          updated_at?: string
          url_midia?: string | null
          user_id: string
        }
        Update: {
          arquivo_path?: string | null
          categoria?: Database["public"]["Enums"]["categoria_conteudo"]
          conteudo_texto?: string | null
          created_at?: string
          descricao?: string | null
          duracao_estimada?: string | null
          fase?: string
          id?: string
          obrigatorio?: boolean | null
          ordem?: number | null
          status?: Database["public"]["Enums"]["status_conteudo"]
          tags?: string[] | null
          thumbnail_url?: string | null
          tipo?: Database["public"]["Enums"]["tipo_conteudo"]
          titulo?: string
          updated_at?: string
          url_midia?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contratos_acompanhamento: {
        Row: {
          created_at: string
          data_inicio: string
          data_vencimento: string
          id: string
          modalidade: string
          observacoes: string | null
          paciente_id: string
          status: string
          updated_at: string
          user_id: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_inicio?: string
          data_vencimento: string
          id?: string
          modalidade?: string
          observacoes?: string | null
          paciente_id: string
          status?: string
          updated_at?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_inicio?: string
          data_vencimento?: string
          id?: string
          modalidade?: string
          observacoes?: string | null
          paciente_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_acompanhamento_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          arquivada: boolean
          created_at: string
          id: string
          nao_lidas_nutri: number
          nao_lidas_paciente: number
          nutri_id: string
          paciente_id: string
          ultima_mensagem_em: string | null
          ultima_mensagem_texto: string | null
          updated_at: string
        }
        Insert: {
          arquivada?: boolean
          created_at?: string
          id?: string
          nao_lidas_nutri?: number
          nao_lidas_paciente?: number
          nutri_id: string
          paciente_id: string
          ultima_mensagem_em?: string | null
          ultima_mensagem_texto?: string | null
          updated_at?: string
        }
        Update: {
          arquivada?: boolean
          created_at?: string
          id?: string
          nao_lidas_nutri?: number
          nao_lidas_paciente?: number
          nutri_id?: string
          paciente_id?: string
          ultima_mensagem_em?: string | null
          ultima_mensagem_texto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_config: {
        Row: {
          ativo: boolean
          created_at: string
          frequencia: string
          id: string
          paciente_id: string
          refeicoes_habilitadas: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          frequencia?: string
          id?: string
          paciente_id: string
          refeicoes_habilitadas?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          frequencia?: string
          id?: string
          paciente_id?: string
          refeicoes_habilitadas?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_config_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_registros: {
        Row: {
          created_at: string
          data_registro: string
          descricao: string
          feedback_data: string | null
          feedback_nutri: string | null
          foto_path: string | null
          horario: string | null
          id: string
          paciente_id: string
          paciente_user_id: string
          sentimento: string | null
          tipo_refeicao: string
          updated_at: string
          visto_nutri: boolean
        }
        Insert: {
          created_at?: string
          data_registro?: string
          descricao?: string
          feedback_data?: string | null
          feedback_nutri?: string | null
          foto_path?: string | null
          horario?: string | null
          id?: string
          paciente_id: string
          paciente_user_id: string
          sentimento?: string | null
          tipo_refeicao?: string
          updated_at?: string
          visto_nutri?: boolean
        }
        Update: {
          created_at?: string
          data_registro?: string
          descricao?: string
          feedback_data?: string | null
          feedback_nutri?: string | null
          foto_path?: string | null
          horario?: string | null
          id?: string
          paciente_id?: string
          paciente_user_id?: string
          sentimento?: string | null
          tipo_refeicao?: string
          updated_at?: string
          visto_nutri?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "diario_registros_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_gerados: {
        Row: {
          arquivo_path: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          nome: string
          paciente_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          arquivo_path?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nome: string
          paciente_id: string
          tipo?: string
          user_id: string
        }
        Update: {
          arquivo_path?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nome?: string
          paciente_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_membros: {
        Row: {
          acesso_todos_pacientes: boolean
          ativo: boolean
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          created_by: string
          deve_trocar_senha: boolean
          email: string
          funcao: string
          funcao_personalizada: string | null
          id: string
          nome_completo: string
          pacientes_atribuidos: string[] | null
          permissoes: Json
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          acesso_todos_pacientes?: boolean
          ativo?: boolean
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          created_by: string
          deve_trocar_senha?: boolean
          email: string
          funcao?: string
          funcao_personalizada?: string | null
          id?: string
          nome_completo: string
          pacientes_atribuidos?: string[] | null
          permissoes?: Json
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          acesso_todos_pacientes?: boolean
          ativo?: boolean
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          deve_trocar_senha?: boolean
          email?: string
          funcao?: string
          funcao_personalizada?: string | null
          id?: string
          nome_completo?: string
          pacientes_atribuidos?: string[] | null
          permissoes?: Json
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      evolucao_fotos: {
        Row: {
          angulo: string
          created_at: string
          data_registro: string
          foto_path: string
          id: string
          observacoes: string | null
          paciente_id: string
          user_id: string
        }
        Insert: {
          angulo?: string
          created_at?: string
          data_registro?: string
          foto_path: string
          id?: string
          observacoes?: string | null
          paciente_id: string
          user_id: string
        }
        Update: {
          angulo?: string
          created_at?: string
          data_registro?: string
          foto_path?: string
          id?: string
          observacoes?: string | null
          paciente_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolucao_fotos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      exames_laboratoriais: {
        Row: {
          arquivo_path: string
          created_at: string
          data_coleta: string
          id: string
          nome_exame: string
          observacoes: string | null
          paciente_id: string
          user_id: string
        }
        Insert: {
          arquivo_path: string
          created_at?: string
          data_coleta?: string
          id?: string
          nome_exame: string
          observacoes?: string | null
          paciente_id: string
          user_id: string
        }
        Update: {
          arquivo_path?: string
          created_at?: string
          data_coleta?: string
          id?: string
          nome_exame?: string
          observacoes?: string | null
          paciente_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_laboratoriais_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_receitas: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string
          descricao: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          paciente_id: string | null
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_pagamento?: string
          descricao: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          paciente_id?: string | null
          status?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_pagamento?: string
          descricao?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          paciente_id?: string | null
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          anotacoes: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          origem: string
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
          valor_estimado: number | null
        }
        Insert: {
          anotacoes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          origem?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
          valor_estimado?: number | null
        }
        Update: {
          anotacoes?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          origem?: string
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
          valor_estimado?: number | null
        }
        Relationships: []
      }
      manipulado_ativos: {
        Row: {
          dose: number | null
          id: string
          nome_ativo: string
          suplemento_id: string
          unidade: string | null
        }
        Insert: {
          dose?: number | null
          id?: string
          nome_ativo: string
          suplemento_id: string
          unidade?: string | null
        }
        Update: {
          dose?: number | null
          id?: string
          nome_ativo?: string
          suplemento_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manipulado_ativos_suplemento_id_fkey"
            columns: ["suplemento_id"]
            isOneToOne: false
            referencedRelation: "suplementos_banco"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_paciente: {
        Row: {
          arquivo_mime: string | null
          arquivo_nome: string | null
          arquivo_path: string | null
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          paciente_id: string
          tipo: string
          titulo: string
          updated_at: string
          url_externa: string | null
          user_id: string
          visto_em: string | null
        }
        Insert: {
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          paciente_id: string
          tipo?: string
          titulo: string
          updated_at?: string
          url_externa?: string | null
          user_id: string
          visto_em?: string | null
        }
        Update: {
          arquivo_mime?: string | null
          arquivo_nome?: string | null
          arquivo_path?: string | null
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          paciente_id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          url_externa?: string | null
          user_id?: string
          visto_em?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          arquivo_url: string | null
          conteudo: string
          conversa_id: string
          created_at: string
          id: string
          lida: boolean
          lida_em: string | null
          referencia_id: string | null
          remetente_id: string
          tipo: string
        }
        Insert: {
          arquivo_url?: string | null
          conteudo?: string
          conversa_id: string
          created_at?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          referencia_id?: string | null
          remetente_id: string
          tipo?: string
        }
        Update: {
          arquivo_url?: string | null
          conteudo?: string
          conversa_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          referencia_id?: string | null
          remetente_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_paciente: {
        Row: {
          concluida_em: string | null
          created_at: string
          descricao: string | null
          id: string
          paciente_id: string
          prazo: string | null
          prioridade: string
          status: string
          tipo: string
          titulo: string
          unidade: string | null
          updated_at: string
          user_id: string
          valor_alvo: number | null
          valor_atual: number | null
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          paciente_id: string
          prazo?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          titulo: string
          unidade?: string | null
          updated_at?: string
          user_id: string
          valor_alvo?: number | null
          valor_atual?: number | null
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          paciente_id?: string
          prazo?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          titulo?: string
          unidade?: string | null
          updated_at?: string
          user_id?: string
          valor_alvo?: number | null
          valor_atual?: number | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          cor: string
          created_at: string
          descricao: string
          id: string
          lida: boolean
          link: string | null
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string
          id?: string
          lida?: boolean
          link?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string
          id?: string
          lida?: boolean
          link?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      notificacoes_email: {
        Row: {
          assunto: string
          created_at: string
          destinatario: string
          enviado_por: string | null
          erro: string | null
          id: string
          paciente_id: string
          provider_id: string | null
          status: string
          tipo: string
          user_id: string
        }
        Insert: {
          assunto: string
          created_at?: string
          destinatario: string
          enviado_por?: string | null
          erro?: string | null
          id?: string
          paciente_id: string
          provider_id?: string | null
          status?: string
          tipo: string
          user_id: string
        }
        Update: {
          assunto?: string
          created_at?: string
          destinatario?: string
          enviado_por?: string | null
          erro?: string | null
          id?: string
          paciente_id?: string
          provider_id?: string | null
          status?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_email_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      orientacoes: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_orientacao"]
          conteudo: string
          created_at: string
          data_envio: string | null
          enviada: boolean
          id: string
          paciente_id: string
          titulo: string
          user_id: string
          visualizada: boolean
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_orientacao"]
          conteudo?: string
          created_at?: string
          data_envio?: string | null
          enviada?: boolean
          id?: string
          paciente_id: string
          titulo: string
          user_id: string
          visualizada?: boolean
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_orientacao"]
          conteudo?: string
          created_at?: string
          data_envio?: string | null
          enviada?: boolean
          id?: string
          paciente_id?: string
          titulo?: string
          user_id?: string
          visualizada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orientacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente_portal_permissoes: {
        Row: {
          avaliacoes_fisicas: boolean
          chat: boolean
          checkin_semanal: boolean
          created_at: string
          diario_alimentar: boolean
          evolucao_fotografica: boolean
          id: string
          materiais: boolean
          metas: boolean
          paciente_id: string
          plano_alimentar: boolean
          receituario: boolean
          updated_at: string
        }
        Insert: {
          avaliacoes_fisicas?: boolean
          chat?: boolean
          checkin_semanal?: boolean
          created_at?: string
          diario_alimentar?: boolean
          evolucao_fotografica?: boolean
          id?: string
          materiais?: boolean
          metas?: boolean
          paciente_id: string
          plano_alimentar?: boolean
          receituario?: boolean
          updated_at?: string
        }
        Update: {
          avaliacoes_fisicas?: boolean
          chat?: boolean
          checkin_semanal?: boolean
          created_at?: string
          diario_alimentar?: boolean
          evolucao_fotografica?: boolean
          id?: string
          materiais?: boolean
          metas?: boolean
          paciente_id?: string
          plano_alimentar?: boolean
          receituario?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paciente_portal_permissoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          account_status: string | null
          alergias: string | null
          altura: number | null
          ativo: boolean | null
          auth_user_id: string | null
          created_at: string
          data_nascimento: string | null
          deve_trocar_senha: boolean
          email: string | null
          fase_real: Database["public"]["Enums"]["fase_real"] | null
          historico_patologias: string | null
          id: string
          medicamentos: string | null
          nivel_atividade: Database["public"]["Enums"]["nivel_atividade"] | null
          nome_completo: string
          objetivo: Database["public"]["Enums"]["objetivo_principal"] | null
          objetivo_outro: string | null
          observacoes_comportamentais: string | null
          peso_inicial: number | null
          receber_emails: boolean
          restricoes_alimentares: string | null
          rotina_sono: string | null
          sexo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string | null
          alergias?: string | null
          altura?: number | null
          ativo?: boolean | null
          auth_user_id?: string | null
          created_at?: string
          data_nascimento?: string | null
          deve_trocar_senha?: boolean
          email?: string | null
          fase_real?: Database["public"]["Enums"]["fase_real"] | null
          historico_patologias?: string | null
          id?: string
          medicamentos?: string | null
          nivel_atividade?:
            | Database["public"]["Enums"]["nivel_atividade"]
            | null
          nome_completo: string
          objetivo?: Database["public"]["Enums"]["objetivo_principal"] | null
          objetivo_outro?: string | null
          observacoes_comportamentais?: string | null
          peso_inicial?: number | null
          receber_emails?: boolean
          restricoes_alimentares?: string | null
          rotina_sono?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string | null
          alergias?: string | null
          altura?: number | null
          ativo?: boolean | null
          auth_user_id?: string | null
          created_at?: string
          data_nascimento?: string | null
          deve_trocar_senha?: boolean
          email?: string | null
          fase_real?: Database["public"]["Enums"]["fase_real"] | null
          historico_patologias?: string | null
          id?: string
          medicamentos?: string | null
          nivel_atividade?:
            | Database["public"]["Enums"]["nivel_atividade"]
            | null
          nome_completo?: string
          objetivo?: Database["public"]["Enums"]["objetivo_principal"] | null
          objetivo_outro?: string | null
          observacoes_comportamentais?: string | null
          peso_inicial?: number | null
          receber_emails?: boolean
          restricoes_alimentares?: string | null
          rotina_sono?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planos_alimentares: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          is_template: boolean | null
          nome: string
          objetivo_template:
            | Database["public"]["Enums"]["objetivo_principal"]
            | null
          observacoes: string | null
          paciente_id: string | null
          pdf_nome: string | null
          pdf_path: string | null
          pdf_url: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          is_template?: boolean | null
          nome?: string
          objetivo_template?:
            | Database["public"]["Enums"]["objetivo_principal"]
            | null
          observacoes?: string | null
          paciente_id?: string | null
          pdf_nome?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          is_template?: boolean | null
          nome?: string
          objetivo_template?:
            | Database["public"]["Enums"]["objetivo_principal"]
            | null
          observacoes?: string | null
          paciente_id?: string | null
          pdf_nome?: string | null
          pdf_path?: string | null
          pdf_url?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_alimentares_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      prescricoes_suplementos: {
        Row: {
          ativa: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          dose_prescrita: string | null
          duracao: string | null
          farmacia: string | null
          frequencia: string | null
          id: string
          instrucoes_farmacia: string | null
          momento_uso: string | null
          observacoes_internas: string | null
          observacoes_paciente: string | null
          paciente_id: string
          qtd_capsulas: number | null
          suplemento_id: string
          unidade_dose: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dose_prescrita?: string | null
          duracao?: string | null
          farmacia?: string | null
          frequencia?: string | null
          id?: string
          instrucoes_farmacia?: string | null
          momento_uso?: string | null
          observacoes_internas?: string | null
          observacoes_paciente?: string | null
          paciente_id: string
          qtd_capsulas?: number | null
          suplemento_id: string
          unidade_dose?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          dose_prescrita?: string | null
          duracao?: string | null
          farmacia?: string | null
          frequencia?: string | null
          id?: string
          instrucoes_farmacia?: string | null
          momento_uso?: string | null
          observacoes_internas?: string | null
          observacoes_paciente?: string | null
          paciente_id?: string
          qtd_capsulas?: number | null
          suplemento_id?: string
          unidade_dose?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescricoes_suplementos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescricoes_suplementos_suplemento_id_fkey"
            columns: ["suplemento_id"]
            isOneToOne: false
            referencedRelation: "suplementos_banco"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          crn: string | null
          id: string
          nome_completo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crn?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crn?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionarios: {
        Row: {
          created_at: string
          data_envio: string | null
          data_resposta: string | null
          id: string
          paciente_id: string
          respostas: Json | null
          status: Database["public"]["Enums"]["status_questionario"]
          tipo: Database["public"]["Enums"]["tipo_questionario"]
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          id?: string
          paciente_id: string
          respostas?: Json | null
          status?: Database["public"]["Enums"]["status_questionario"]
          tipo: Database["public"]["Enums"]["tipo_questionario"]
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          id?: string
          paciente_id?: string
          respostas?: Json | null
          status?: Database["public"]["Enums"]["status_questionario"]
          tipo?: Database["public"]["Enums"]["tipo_questionario"]
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionarios_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          calorias_total: number | null
          carboidrato_total: number | null
          created_at: string
          descricao: string | null
          fibra_total: number | null
          foto_url: string | null
          gordura_total: number | null
          id: string
          ingredientes: Json | null
          modo_preparo: string | null
          porcoes: number | null
          proteina_total: number | null
          tags: string[] | null
          tempo_preparo_min: number | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calorias_total?: number | null
          carboidrato_total?: number | null
          created_at?: string
          descricao?: string | null
          fibra_total?: number | null
          foto_url?: string | null
          gordura_total?: number | null
          id?: string
          ingredientes?: Json | null
          modo_preparo?: string | null
          porcoes?: number | null
          proteina_total?: number | null
          tags?: string[] | null
          tempo_preparo_min?: number | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calorias_total?: number | null
          carboidrato_total?: number | null
          created_at?: string
          descricao?: string | null
          fibra_total?: number | null
          foto_url?: string | null
          gordura_total?: number | null
          id?: string
          ingredientes?: Json | null
          modo_preparo?: string | null
          porcoes?: number | null
          proteina_total?: number | null
          tags?: string[] | null
          tempo_preparo_min?: number | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receitas_pacientes: {
        Row: {
          enviada_em: string
          id: string
          paciente_id: string
          receita_id: string
          user_id: string
          visualizada: boolean | null
        }
        Insert: {
          enviada_em?: string
          id?: string
          paciente_id: string
          receita_id: string
          user_id: string
          visualizada?: boolean | null
        }
        Update: {
          enviada_em?: string
          id?: string
          paciente_id?: string
          receita_id?: string
          user_id?: string
          visualizada?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "receitas_pacientes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_pacientes_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      refeicoes: {
        Row: {
          created_at: string
          horario_sugerido: string | null
          id: string
          nome_customizado: string | null
          observacoes: string | null
          ordem: number | null
          plano_id: string
          substituicoes_sugeridas: string | null
          tipo: Database["public"]["Enums"]["tipo_refeicao"]
          totais_opcao: Json
        }
        Insert: {
          created_at?: string
          horario_sugerido?: string | null
          id?: string
          nome_customizado?: string | null
          observacoes?: string | null
          ordem?: number | null
          plano_id: string
          substituicoes_sugeridas?: string | null
          tipo: Database["public"]["Enums"]["tipo_refeicao"]
          totais_opcao?: Json
        }
        Update: {
          created_at?: string
          horario_sugerido?: string | null
          id?: string
          nome_customizado?: string | null
          observacoes?: string | null
          ordem?: number | null
          plano_id?: string
          substituicoes_sugeridas?: string | null
          tipo?: Database["public"]["Enums"]["tipo_refeicao"]
          totais_opcao?: Json
        }
        Relationships: [
          {
            foreignKeyName: "refeicoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_alimentares"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_rapidas: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          texto: string
          titulo: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          texto?: string
          titulo: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          texto?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      substituicoes: {
        Row: {
          alimento_original: string
          alimento_substituto: string
          created_at: string
          grupo: Database["public"]["Enums"]["grupo_alimentar"]
          id: string
          observacoes: string | null
          user_id: string
        }
        Insert: {
          alimento_original: string
          alimento_substituto: string
          created_at?: string
          grupo: Database["public"]["Enums"]["grupo_alimentar"]
          id?: string
          observacoes?: string | null
          user_id: string
        }
        Update: {
          alimento_original?: string
          alimento_substituto?: string
          created_at?: string
          grupo?: Database["public"]["Enums"]["grupo_alimentar"]
          id?: string
          observacoes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suplementos_banco: {
        Row: {
          apresentacao: string | null
          ativo: boolean
          categoria: Database["public"]["Enums"]["categoria_suplemento"]
          created_at: string
          dose_padrao: number | null
          finalidade: string | null
          id: string
          marca_referencia: string | null
          nome: string
          observacoes: string | null
          tipo: Database["public"]["Enums"]["tipo_suplemento"]
          unidade_medida: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apresentacao?: string | null
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_suplemento"]
          created_at?: string
          dose_padrao?: number | null
          finalidade?: string | null
          id?: string
          marca_referencia?: string | null
          nome: string
          observacoes?: string | null
          tipo?: Database["public"]["Enums"]["tipo_suplemento"]
          unidade_medida?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apresentacao?: string | null
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_suplemento"]
          created_at?: string
          dose_padrao?: number | null
          finalidade?: string | null
          id?: string
          marca_referencia?: string | null
          nome?: string
          observacoes?: string | null
          tipo?: Database["public"]["Enums"]["tipo_suplemento"]
          unidade_medida?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_nutri_data: { Args: { _nutri_id: string }; Returns: boolean }
      equipe_can_access_paciente: {
        Args: { _paciente_id: string }
        Returns: boolean
      }
      equipe_has_permission: {
        Args: { _modulo: string; _nutri_id: string; _permissao: string }
        Returns: boolean
      }
      get_anamnese_by_token: {
        Args: { p_token: string }
        Returns: {
          espaco_livre: string
          historico_alimentar: string
          historico_medico: string
          historico_treino: string
          id: string
          objetivos_motivacoes: string
          paciente_id: string
          respondido: boolean
          saude_intestinal: string
          sono_estresse: string
        }[]
      }
      get_checklist_by_token: {
        Args: { p_token: string }
        Returns: {
          aderencia_plano: number
          id: string
          nivel_energia: number
          observacoes: string
          paciente_id: string
          peso: number
          qualidade_sono: number
          respondido: boolean
          semana: string
        }[]
      }
      get_default_substitutions: {
        Args: never
        Returns: {
          alimento_original: string
          alimento_substituto: string
          grupo: string
          observacoes: string
        }[]
      }
      get_questionario_by_token: {
        Args: { p_token: string }
        Returns: {
          data_envio: string
          data_resposta: string
          id: string
          paciente_id: string
          respostas: Json
          status: string
          tipo: string
          token: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      respond_questionario_by_token: {
        Args: { p_respostas: Json; p_token: string }
        Returns: boolean
      }
      submit_anamnese: {
        Args: {
          p_espaco_livre?: string
          p_historico_alimentar?: string
          p_historico_medico?: string
          p_historico_treino?: string
          p_objetivos_motivacoes?: string
          p_saude_intestinal?: string
          p_sono_estresse?: string
          p_token: string
        }
        Returns: boolean
      }
      submit_checklist: {
        Args: {
          p_aderencia_plano?: number
          p_nivel_energia?: number
          p_observacoes?: string
          p_peso?: number
          p_qualidade_sono?: number
          p_token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "nutri" | "paciente" | "equipe"
      categoria_conteudo:
        | "alimentacao"
        | "comportamento"
        | "rotina"
        | "exercicio"
        | "sono"
        | "saude_intestinal"
        | "ansiedade"
        | "motivacao"
        | "receitas"
        | "outro"
      categoria_orientacao:
        | "alimentacao"
        | "hidratacao"
        | "sono"
        | "treino"
        | "intestino"
        | "comportamento"
        | "outro"
      categoria_suplemento:
        | "proteinas_aminoacidos"
        | "vitaminas_minerais"
        | "omega_gorduras"
        | "probioticos_fibras"
        | "performance_energia"
        | "fitoterapicos"
        | "colageno_pele"
        | "emagrecimento"
        | "ganho_massa"
        | "saude_intestinal"
        | "hormonal"
        | "sono_ansiedade"
        | "imunidade"
        | "outro"
      fase_real: "rotina" | "estrategia" | "autonomia" | "liberdade"
      grupo_alimentar:
        | "cereais"
        | "verduras"
        | "frutas"
        | "leguminosas"
        | "oleaginosas"
        | "carnes"
        | "leites"
        | "ovos"
        | "oleos"
        | "acucares"
        | "outros"
      nivel_atividade:
        | "sedentario"
        | "leve"
        | "moderado"
        | "intenso"
        | "muito_intenso"
      objetivo_principal:
        | "emagrecimento"
        | "ganho_de_massa"
        | "saude_intestinal"
        | "controle_ansiedade_alimentar"
        | "performance"
        | "outro"
      preenchido_por: "nutricionista" | "paciente"
      status_consulta: "agendado" | "realizado" | "cancelado"
      status_conteudo: "rascunho" | "publicado"
      status_questionario: "pendente" | "enviado" | "respondido"
      tipo_consulta: "primeira_consulta" | "retorno" | "online" | "presencial"
      tipo_conteudo: "video" | "pdf" | "texto" | "audio" | "link"
      tipo_questionario:
        | "anamnese"
        | "checkin_semanal"
        | "qualidade_vida"
        | "comportamento_alimentar"
        | "sintomas_intestinais"
      tipo_refeicao:
        | "cafe_da_manha"
        | "lanche_da_manha"
        | "almoco"
        | "lanche_da_tarde"
        | "jantar"
        | "ceia"
      tipo_suplemento: "suplemento" | "manipulado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["nutri", "paciente", "equipe"],
      categoria_conteudo: [
        "alimentacao",
        "comportamento",
        "rotina",
        "exercicio",
        "sono",
        "saude_intestinal",
        "ansiedade",
        "motivacao",
        "receitas",
        "outro",
      ],
      categoria_orientacao: [
        "alimentacao",
        "hidratacao",
        "sono",
        "treino",
        "intestino",
        "comportamento",
        "outro",
      ],
      categoria_suplemento: [
        "proteinas_aminoacidos",
        "vitaminas_minerais",
        "omega_gorduras",
        "probioticos_fibras",
        "performance_energia",
        "fitoterapicos",
        "colageno_pele",
        "emagrecimento",
        "ganho_massa",
        "saude_intestinal",
        "hormonal",
        "sono_ansiedade",
        "imunidade",
        "outro",
      ],
      fase_real: ["rotina", "estrategia", "autonomia", "liberdade"],
      grupo_alimentar: [
        "cereais",
        "verduras",
        "frutas",
        "leguminosas",
        "oleaginosas",
        "carnes",
        "leites",
        "ovos",
        "oleos",
        "acucares",
        "outros",
      ],
      nivel_atividade: [
        "sedentario",
        "leve",
        "moderado",
        "intenso",
        "muito_intenso",
      ],
      objetivo_principal: [
        "emagrecimento",
        "ganho_de_massa",
        "saude_intestinal",
        "controle_ansiedade_alimentar",
        "performance",
        "outro",
      ],
      preenchido_por: ["nutricionista", "paciente"],
      status_consulta: ["agendado", "realizado", "cancelado"],
      status_conteudo: ["rascunho", "publicado"],
      status_questionario: ["pendente", "enviado", "respondido"],
      tipo_consulta: ["primeira_consulta", "retorno", "online", "presencial"],
      tipo_conteudo: ["video", "pdf", "texto", "audio", "link"],
      tipo_questionario: [
        "anamnese",
        "checkin_semanal",
        "qualidade_vida",
        "comportamento_alimentar",
        "sintomas_intestinais",
      ],
      tipo_refeicao: [
        "cafe_da_manha",
        "lanche_da_manha",
        "almoco",
        "lanche_da_tarde",
        "jantar",
        "ceia",
      ],
      tipo_suplemento: ["suplemento", "manipulado"],
    },
  },
} as const
