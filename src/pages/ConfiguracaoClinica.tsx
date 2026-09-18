import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Building, Palette, Mail, Info, Settings, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { statusEmail } from "@/lib/notificacoes";

interface ConfigClinica {
  id?: string;
  nome_clinica: string;
  endereco: string;
  telefone: string;
  crn: string;
  site: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  mensagem_boas_vindas: string;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string;
  incluir_capa: boolean;
  marca_dagua: boolean;
}

const defaultConfig: ConfigClinica = {
  nome_clinica: "Gabriel Sanches Nutrição",
  endereco: "",
  telefone: "",
  crn: "",
  site: "gabrielnutri.com.br",
  instagram: "",
  facebook: "",
  whatsapp: "",
  mensagem_boas_vindas: "Bem-vindo ao seu portal nutricional! Aqui você acompanha sua evolução e acessa seu plano personalizado.",
  cor_primaria: "#2B3990",
  cor_secundaria: "#10B981",
  logo_url: "",
  incluir_capa: true,
  marca_dagua: false,
};

export default function ConfiguracaoClinica() {
  // Campos da migration 20260918120000. Ficam null se ela ainda nao foi
  // aplicada; nesse caso a tela funciona igual e so esconde estes campos.
  const [emailExtra, setEmailExtra] = useState<{ email_resposta: string; dias_alerta_vencimento: number } | null>(null);
  const [provedorOk, setProvedorOk] = useState<boolean | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigClinica>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConfig();
  }, [user]);

  const loadConfig = async () => {
    // Leitura separada e tolerante: sem a migration, estas colunas nao existem.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("configuracoes_clinica")
      .select("email_resposta, dias_alerta_vencimento")
      .eq("user_id", user!.id)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: any) => {
        if (error) { setEmailExtra(null); return; }
        setEmailExtra({
          email_resposta: data?.email_resposta || "",
          dias_alerta_vencimento: data?.dias_alerta_vencimento || 7,
        });
      });
    statusEmail().then((st) => setProvedorOk(st ? st.configurado : null));
    try {
      const { data } = await supabase
        .from("configuracoes_clinica")
        .select("id,nome_clinica,endereco,telefone,crn,site,instagram,facebook,whatsapp,mensagem_boas_vindas,cor_primaria,cor_secundaria,logo_url,incluir_capa,marca_dagua")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          nome_clinica: data.nome_clinica || defaultConfig.nome_clinica,
          endereco: data.endereco || "",
          telefone: data.telefone || "",
          crn: data.crn || "",
          site: data.site || defaultConfig.site,
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          whatsapp: data.whatsapp || "",
          mensagem_boas_vindas: data.mensagem_boas_vindas || defaultConfig.mensagem_boas_vindas,
          cor_primaria: data.cor_primaria || defaultConfig.cor_primaria,
          cor_secundaria: data.cor_secundaria || defaultConfig.cor_secundaria,
          logo_url: data.logo_url || "",
          incluir_capa: data.incluir_capa ?? true,
          marca_dagua: data.marca_dagua ?? false,
        });
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const payload = {
        user_id: user.id,
        nome_clinica: config.nome_clinica,
        endereco: config.endereco || null,
        telefone: config.telefone || null,
        crn: config.crn || null,
        site: config.site || null,
        instagram: config.instagram || null,
        facebook: config.facebook || null,
        whatsapp: config.whatsapp || null,
        mensagem_boas_vindas: config.mensagem_boas_vindas,
        cor_primaria: config.cor_primaria,
        cor_secundaria: config.cor_secundaria,
        logo_url: config.logo_url || null,
        incluir_capa: config.incluir_capa,
        marca_dagua: config.marca_dagua,
      };

      if (config.id) {
        const { error } = await supabase
          .from("configuracoes_clinica")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("configuracoes_clinica")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      if (emailExtra) {
        const dias = Math.min(60, Math.max(1, Math.round(emailExtra.dias_alerta_vencimento || 7)));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: extraErr } = await (supabase as any)
          .from("configuracoes_clinica")
          .update({ email_resposta: emailExtra.email_resposta.trim() || null, dias_alerta_vencimento: dias })
          .eq("user_id", user!.id);
        if (extraErr) throw extraErr;
      }

      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof ConfigClinica, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações da Clínica" description="Personalize os dados da sua clínica e portal" icon={Settings}>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </PageHeader>

      <Tabs defaultValue="consultorio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultorio">
            <Building className="h-4 w-4 mr-2" />
            Consultório
          </TabsTrigger>
          <TabsTrigger value="identidade">
            <Palette className="h-4 w-4 mr-2" />
            Identidade
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            E-mail
          </TabsTrigger>
          <TabsTrigger value="portal">
            <Info className="h-4 w-4 mr-2" />
            Portal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultorio">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Consultório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Clínica/Consultório</Label>
                  <Input
                    id="nome"
                    value={config.nome_clinica}
                    onChange={(e) => updateConfig("nome_clinica", e.target.value)}
                    placeholder="Gabriel Sanches Nutrição"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crn">CRN</Label>
                  <Input
                    id="crn"
                    value={config.crn}
                    onChange={(e) => updateConfig("crn", e.target.value)}
                    placeholder="CRN 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={config.telefone}
                    onChange={(e) => updateConfig("telefone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site">Site</Label>
                  <Input
                    id="site"
                    value={config.site}
                    onChange={(e) => updateConfig("site", e.target.value)}
                    placeholder="gabrielnutri.com.br"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Textarea
                  id="endereco"
                  value={config.endereco}
                  onChange={(e) => updateConfig("endereco", e.target.value)}
                  placeholder="Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={config.instagram}
                    onChange={(e) => updateConfig("instagram", e.target.value)}
                    placeholder="@gabrielnutri"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={config.facebook}
                    onChange={(e) => updateConfig("facebook", e.target.value)}
                    placeholder="Gabriel Nutrição"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={config.whatsapp}
                    onChange={(e) => updateConfig("whatsapp", e.target.value)}
                    placeholder="11999999999"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identidade">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cor-primaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.cor_primaria}
                      onChange={(e) => updateConfig("cor_primaria", e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={config.cor_primaria}
                      onChange={(e) => updateConfig("cor_primaria", e.target.value)}
                      placeholder="#2B3990"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor-secundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.cor_secundaria}
                      onChange={(e) => updateConfig("cor_secundaria", e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={config.cor_secundaria}
                      onChange={(e) => updateConfig("cor_secundaria", e.target.value)}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">URL da Logo</Label>
                <Input
                  id="logo"
                  value={config.logo_url}
                  onChange={(e) => updateConfig("logo_url", e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                />
                <p className="text-sm text-muted-foreground">
                  Logo utilizada nos PDFs e materiais da clínica
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="incluir-capa">Incluir Capa nos PDFs</Label>
                  <p className="text-sm text-muted-foreground">
                    Adiciona uma capa personalizada nos documentos PDF
                  </p>
                </div>
                <Switch
                  id="incluir-capa"
                  checked={config.incluir_capa}
                  onCheckedChange={(checked) => updateConfig("incluir_capa", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="marca-dagua">Marca D'água</Label>
                  <p className="text-sm text-muted-foreground">
                    Adiciona marca d'água nos PDFs para proteção
                  </p>
                </div>
                <Switch
                  id="marca-dagua"
                  checked={config.marca_dagua}
                  onCheckedChange={(checked) => updateConfig("marca_dagua", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avisos por e-mail para as pacientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {provedorOk === true && (
                  <Alert className="border-success/30 bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription>
                      O envio está configurado. Quando você salva algo com a caixa "Avisar a paciente"
                      marcada, ela recebe o e-mail.
                    </AlertDescription>
                  </Alert>
                )}
                {provedorOk === false && (
                  <Alert className="border-warning/30 bg-warning/10">
                    <Info className="h-4 w-4 text-warning" />
                    <AlertDescription>
                      O serviço de e-mail ainda não está configurado. Os avisos ficam registrados no histórico de
                      cada paciente, mas não chegam até ela. A configuração é feita uma vez, no Supabase, com a
                      chave do Resend e o remetente.
                    </AlertDescription>
                  </Alert>
                )}
                {provedorOk === null && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Não consegui verificar o serviço de e-mail. A função de envio pode ainda não ter sido publicada.
                    </AlertDescription>
                  </Alert>
                )}

                {emailExtra ? (
                  <div className="space-y-2">
                    <Label htmlFor="email-resposta">E-mail para respostas</Label>
                    <Input
                      id="email-resposta"
                      type="email"
                      value={emailExtra.email_resposta}
                      onChange={(e) => setEmailExtra((x) => x && { ...x, email_resposta: e.target.value })}
                      placeholder="O e-mail da sua conta, se ficar vazio"
                    />
                    <p className="text-sm text-muted-foreground">
                      Quando a paciente responder um aviso, a resposta chega aqui.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Os campos de e-mail aparecem aqui depois que a atualização do banco for aplicada.
                  </p>
                )}
              </CardContent>
            </Card>

            {emailExtra && (
              <Card>
                <CardHeader>
                  <CardTitle>Vencimento dos planos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label htmlFor="dias-alerta">Destacar a partir de quantos dias antes</Label>
                  <Input
                    id="dias-alerta"
                    type="number"
                    min={1}
                    max={60}
                    className="max-w-[140px]"
                    value={emailExtra.dias_alerta_vencimento}
                    onChange={(e) => setEmailExtra((x) => x && { ...x, dias_alerta_vencimento: Number(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    O plano aparece em "Vencendo" no Dashboard, no sino e na página de Vencimentos. Os lembretes
                    ficam só no sistema: nenhum e-mail é enviado por causa do vencimento.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="portal">
          <Card>
            <CardHeader>
              <CardTitle>Personalização do Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mensagem-boas-vindas">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="mensagem-boas-vindas"
                  value={config.mensagem_boas_vindas}
                  onChange={(e) => updateConfig("mensagem_boas_vindas", e.target.value)}
                  placeholder="Bem-vindo ao seu portal nutricional!"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Esta mensagem será exibida na tela inicial do portal do paciente
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Preview do Portal</h4>
                <div className="bg-background p-4 rounded border" style={{ borderTopColor: config.cor_primaria, borderTopWidth: '4px' }}>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: config.cor_primaria }}>
                    {config.nome_clinica}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {config.mensagem_boas_vindas}
                  </p>
                  <div className="flex gap-2">
                    <div className="h-8 px-3 rounded text-xs flex items-center text-white" style={{ backgroundColor: config.cor_primaria }}>
                      Plano Alimentar
                    </div>
                    <div className="h-8 px-3 rounded text-xs flex items-center text-white" style={{ backgroundColor: config.cor_secundaria }}>
                      Check-in Semanal
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}