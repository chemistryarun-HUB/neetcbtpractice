#!/bin/sh
# One-off: print four Unit 33 question images (base64) so their labels can be checked.
for u in 1791637374533_g6b3zrfsu8j 1792512194095_5jmauyu3mxa 1791717614181_oco8m0qn0qd 1792231574641_5w3ul6t6uwk; do
  curl -sSf "$VITE_SUPABASE_URL/storage/v1/object/public/question-images/$u.png" -o img.png
  echo "IMG $u $(base64 -w0 img.png)"
done
