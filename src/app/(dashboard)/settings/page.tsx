"use client";

import { useState, type FormEvent } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type SavingState = {
  account: boolean;
  preferences: boolean;
  notifications: boolean;
  security: boolean;
};

const defaultAccount = {
  firstName: "Malak",
  lastName: "Benali",
  email: "malak@phionix.com",
  phone: "+212 612-345-678",
  jobTitle: "Responsable Commercial",
  company: "Phionix",
};

const defaultPreferences = {
  language: "fr",
  timezone: "Africa/Casablanca",
  signature:
    "Bien à vous,\nMalak Benali\nPhionix",
  autoDarkMode: true,
  playSounds: false,
};

const defaultNotifications = {
  conversationAlerts: true,
  taskReminders: true,
  adminEscalations: true,
  productUpdates: false,
  digestFrequency: "daily",
};

const timezones = [
  { value: "Africa/Casablanca", label: "Casablanca (GMT+1)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/London", label: "Londres (GMT)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "Asia/Dubai", label: "Dubaï (GMT+4)" },
];

const languages = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const digestOptions = [
  { value: "realtime", label: "En temps réel" },
  { value: "hourly", label: "Toutes les heures" },
  { value: "daily", label: "Quotidien (9h)" },
  { value: "weekly", label: "Hebdomadaire (lundi 9h)" },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SettingsPage() {
  const { toast } = useToast();

  const [accountForm, setAccountForm] = useState(defaultAccount);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotifications);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState<SavingState>({
    account: false,
    preferences: false,
    notifications: false,
    security: false,
  });

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving((prev) => ({ ...prev, account: true }));
    await wait(600);
    setSaving((prev) => ({ ...prev, account: false }));
    toast({
      title: "Profil mis à jour",
      description: "Vos informations personnelles ont été enregistrées.",
    });
  };

  const handlePreferencesSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving((prev) => ({ ...prev, preferences: true }));
    await wait(500);
    setSaving((prev) => ({ ...prev, preferences: false }));
    toast({
      title: "Préférences sauvegardées",
      description: "Vos préférences d'affichage ont été actualisées.",
    });
  };

  const handleNotificationsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving((prev) => ({ ...prev, notifications: true }));
    await wait(500);
    setSaving((prev) => ({ ...prev, notifications: false }));
    toast({
      title: "Notifications mises à jour",
      description: "Nous appliquerons ces paramètres dès maintenant.",
    });
  };

  const handleSecuritySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!securityForm.currentPassword || !securityForm.newPassword) {
      toast({
        title: "Champs requis manquants",
        description: "Merci de renseigner votre mot de passe actuel et le nouveau.",
        variant: "destructive",
      });
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast({
        title: "Mot de passe non confirmé",
        description: "Le nouveau mot de passe et sa confirmation doivent être identiques.",
        variant: "destructive",
      });
      return;
    }

    setSaving((prev) => ({ ...prev, security: true }));
    await wait(750);
    setSaving((prev) => ({ ...prev, security: false }));
    setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast({
      title: "Mot de passe modifié",
      description: "Votre mot de passe a été mis à jour avec succès.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="space-y-1">
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Personnalisez votre expérience Phionix et gardez le contrôle.</CardDescription>
          </div>
          <Badge variant="outline" className="uppercase">Plan Pro</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="preferences">Préférences</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <form className="space-y-6" onSubmit={handleAccountSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={accountForm.firstName}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={accountForm.lastName}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    autoComplete="family-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={accountForm.email}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={accountForm.phone}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Poste</Label>
                  <Input
                    id="jobTitle"
                    value={accountForm.jobTitle}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, jobTitle: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={accountForm.company}
                    onChange={(event) =>
                      setAccountForm((prev) => ({ ...prev, company: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAccountForm(defaultAccount)}
                  disabled={saving.account}
                >
                  Réinitialiser
                </Button>
                <Button type="submit" disabled={saving.account}>
                  {saving.account ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <form className="space-y-6" onSubmit={handlePreferencesSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">Langue de l'interface</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Choisir une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Sélectionner un fuseau horaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Signature par défaut</Label>
                <Textarea
                  id="signature"
                  rows={4}
                  value={preferences.signature}
                  onChange={(event) =>
                    setPreferences((prev) => ({ ...prev, signature: event.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Mode sombre automatique</p>
                    <p className="text-sm text-muted-foreground">
                      Active le thème sombre après 19h pour réduire la fatigue visuelle.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoDarkMode}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, autoDarkMode: checked }))
                    }
                    aria-label="Activer le mode sombre automatique"
                  />
                </div>
                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Sons d'alerte</p>
                    <p className="text-sm text-muted-foreground">
                      Reçoit un son discret lorsque de nouvelles interactions sont générées.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.playSounds}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, playSounds: checked }))
                    }
                    aria-label="Activer les sons d'alerte"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving.preferences}>
                  {saving.preferences ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <form className="space-y-6" onSubmit={handleNotificationsSubmit}>
              <div className="space-y-4">
                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Alertes de conversation</p>
                    <p className="text-sm text-muted-foreground">
                      Recevoir un e-mail quand un client répond à une conversation suivie.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.conversationAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs((prev) => ({ ...prev, conversationAlerts: checked }))
                    }
                    aria-label="Activer les alertes de conversation"
                  />
                </div>

                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Rappels de tâches</p>
                    <p className="text-sm text-muted-foreground">
                      Envoi d'un rappel une heure avant l'échéance d'une tâche assignée.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs((prev) => ({ ...prev, taskReminders: checked }))
                    }
                    aria-label="Activer les rappels de tâches"
                  />
                </div>

                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Escalades administrateur</p>
                    <p className="text-sm text-muted-foreground">
                      Prévenir l'administrateur quand une opportunité est arrêtée ou annulée.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.adminEscalations}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs((prev) => ({ ...prev, adminEscalations: checked }))
                    }
                    aria-label="Activer les escalades administrateur"
                  />
                </div>

                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Mises à jour produit</p>
                    <p className="text-sm text-muted-foreground">
                      Recevoir uniquement les annonces majeures concernant Phionix.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs.productUpdates}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs((prev) => ({ ...prev, productUpdates: checked }))
                    }
                    aria-label="Activer les mises à jour produit"
                  />
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                  <Label htmlFor="digest">Fréquence du digest IA</Label>
                  <p className="text-sm text-muted-foreground">
                    Résumé généré par Gemini regroupant interactions, tâches et opportunités.
                  </p>
                  <Select
                    value={notificationPrefs.digestFrequency}
                    onValueChange={(value) =>
                      setNotificationPrefs((prev) => ({ ...prev, digestFrequency: value }))
                    }
                  >
                    <SelectTrigger id="digest">
                      <SelectValue placeholder="Choisir une fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      {digestOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving.notifications}>
                  {saving.notifications ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="security" className="space-y-8">
            <form className="space-y-6" onSubmit={handleSecuritySubmit}>
              <div>
                <h4 className="text-base font-semibold">Changer de mot de passe</h4>
                <p className="text-sm text-muted-foreground">
                  Utilisez un mot de passe unique avec au moins 12 caractères.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(event) =>
                      setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={securityForm.newPassword}
                    onChange={(event) =>
                      setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={(event) =>
                      setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving.security}>
                  {saving.security ? "Mise à jour..." : "Modifier le mot de passe"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
