drop policy if exists "shipping_labels_public_read" on storage.objects;

create policy "shipping_labels_admin_read"
on storage.objects for select to authenticated
using (bucket_id = 'shipping-labels' and public.has_role(auth.uid(), 'admin'));

create policy "shipping_labels_admin_write"
on storage.objects for insert to authenticated
with check (bucket_id = 'shipping-labels' and public.has_role(auth.uid(), 'admin'));

create policy "shipping_labels_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'shipping-labels' and public.has_role(auth.uid(), 'admin'));

create policy "shipping_labels_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'shipping-labels' and public.has_role(auth.uid(), 'admin'));