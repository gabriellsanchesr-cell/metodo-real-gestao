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
import { Save, Building, Palette, Mail, Info, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";

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
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_ativo: boolean;
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
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_ativo: false,
};

export default function ConfiguracaoClinica() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigClinica>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConfig();
  }, [user]);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from("configuracoes_clinica")
        .select("id,nome_clinica,endereco,telefone,crn,site,instagram,facebook,whatsapp,mensagem_boas_vindas,cor_primaria,cor_secundaria,logo_url,incluir_capa,marca_dagua,smtp_host,smtp_port,smtp_user,smtp_ativo")
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
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || "",
          smtp_password: "",
          smtp_ativo: data.smtp_ativo ?? false,
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
        smtp_host: config.smtp_host || null,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user || null,
        ...(config.smtp_password ? { smtp_password: config.smtp_password } : {}),
        smtp_ativo: config.smtp_ativo,
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
          <Card>
            <CardHeader>
              <CardTitle>Configurações de E-mail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Configure seu servidor SMTP para enviar notificações personalizadas por e-mail.
                  Se não configurado, o sistema utilizará o e-mail padrão.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>SMTP Personalizado</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar envio de e-mails através do seu servidor
                  </p>
                </div>
                <Switch
                  checked={config.smtp_ativo}
                  onCheckedChange={(checked) => updateConfig("smtp_ativo", checked)}
                />
              </div>

              {config.smtp_ativo && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Servidor SMTP</Label>
                      <Input
                        id="smtp-host"
                        value={config.smtp_host}
                        onChange={(e) => updateConfig("smtp_host", e.target.value)}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Porta</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={config.smtp_port}
                        onChange={(e) => updateConfig("smtp_port", parseInt(e.target.value) || 587)}
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Usuário</Label>
                      <Input
                        id="smtp-user"
                        value={config.smtp_user}
                        onChange={(e) => updateConfig("smtp_user", e.target.value)}
                        placeholder="contato@gabrielnutri.com.br"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">Senha</Label>
                      <Input
                        id="smtp-password"
                        type="password"
                        value={config.smtp_password}
                        onChange={(e) => updateConfig("smtp_password", e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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