# Koperasi Smart Systema Security Specification

## Data Invariants
1. `Anggota` must have a valid NIK (16 digits) and name.
2. `Simpanan` must be linked to an existing `Anggota` ID.
3. `Unit_Usaha` transactions must specify a valid unit type and flow type.
4. All transactions must have a server-generated timestamp.
5. `id_anggota` and `id_transaksi` must be unique and follow the defined prefix pattern.

## The "Dirty Dozen" Payloads (Test Cases)

1. **Identity Theft**: Attempt to create an `Anggota` with a different `ownerId` (if we had one).
2. **Ghost Fields**: Attempt to add `is_admin: true` to a simpanan record.
3. **Invalid ID**: Using `../../bad-path` as a document ID.
4. **Negative Amount**: Sending `jumlah: -100000` in a simpanan transaction.
5. **Future Dating**: Sending a `waktu` from the future (client-side timestamp).
6. **Orphaned Simpanan**: Creating a simpanan for a non-existent `id_anggota`.
7. **Large Payload**: Sending 1MB of junk text in the `keterangan` field.
8. **Unauthorized List**: Attempting to list all members without being signed in.
9. **Status Manipulation**: Changing a member's status to "Aktif" when it's terminal (Non-Aktif).
10. **Duplicate ID**: Attempting to overwrite an existing transaction ID.
11. **Spoofed Email**: Accessing data with an unverified email (if restricted).
12. **Type Poisoning**: Sending `jumlah: "1.000.000"` (string instead of number).

## Red Team Pass Criteria
- Rules reject all "Dirty Dozen" payloads with `PERMISSION_DENIED`.
- Rules enforce `isValidId()` on all document paths.
- Rules enforce `isValid[Entity]()` structure on all writes.
