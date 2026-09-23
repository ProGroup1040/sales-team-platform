import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const result = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    result[index] = raw.charCodeAt(index);
  }
  return result;
}

export function usePushNotifications(enabled = true) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const publicKeyQuery = trpc.pushNotifications.publicKey.useQuery(undefined, { enabled });
  const subscribeMutation = trpc.pushNotifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushNotifications.unsubscribe.useMutation();

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/service-worker.js").then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
    }).catch((error) => console.warn("[WebPush] service worker registration failed", error));
  }, []);

  const enable = useCallback(async () => {
    if (!supported || !publicKeyQuery.data?.publicKey) {
      toast.error("إشعارات الهاتف غير مهيأة على الخادم بعد");
      return false;
    }
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        toast.error("يرجى السماح بالإشعارات من إعدادات المتصفح أو الهاتف");
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKeyQuery.data.publicKey),
      });
      await subscribeMutation.mutateAsync(subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      });
      setIsSubscribed(true);
      toast.success("تم تفعيل تذكيرات المهام اليومية");
      return true;
    } catch (error) {
      console.error("[WebPush] subscribe failed", error);
      toast.error("تعذر تفعيل إشعارات الهاتف");
      return false;
    }
  }, [publicKeyQuery.data?.publicKey, supported, subscribeMutation]);

  const disable = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("تم إيقاف تذكيرات المهام اليومية");
    } catch (error) {
      console.error("[WebPush] unsubscribe failed", error);
      toast.error("تعذر إيقاف إشعارات الهاتف");
    }
  }, [unsubscribeMutation]);

  return {
    supported,
    permission,
    isSubscribed,
    isLoading: publicKeyQuery.isLoading || subscribeMutation.isPending || unsubscribeMutation.isPending,
    enable,
    disable,
  };
}
