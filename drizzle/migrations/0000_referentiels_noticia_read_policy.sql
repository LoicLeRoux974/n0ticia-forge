CREATE POLICY "Authenticated can read referentiels noticia"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'referentiels-noticia');