package com.noteapp.android.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.noteapp.android.R;
import com.noteapp.android.models.Note;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class NotesAdapter extends RecyclerView.Adapter<NotesAdapter.NoteViewHolder> {
    private List<Note> notes;
    private OnNoteClickListener listener;

    public interface OnNoteClickListener {
        void onNoteClick(Note note);
        void onNoteLongClick(Note note);
    }

    public NotesAdapter(List<Note> notes, OnNoteClickListener listener) {
        this.notes = notes;
        this.listener = listener;
    }

    @NonNull
    @Override
    public NoteViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_note, parent, false);
        return new NoteViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull NoteViewHolder holder, int position) {
        Note note = notes.get(position);
        holder.bind(note, listener);
    }

    @Override
    public int getItemCount() {
        return notes.size();
    }

    static class NoteViewHolder extends RecyclerView.ViewHolder {
        private TextView titleText;
        private TextView contentText;
        private TextView dateText;
        private TextView attachmentIndicator;

        public NoteViewHolder(@NonNull View itemView) {
            super(itemView);
            titleText = itemView.findViewById(R.id.note_title);
            contentText = itemView.findViewById(R.id.note_content);
            dateText = itemView.findViewById(R.id.note_date);
            attachmentIndicator = itemView.findViewById(R.id.attachment_indicator);
        }

        public void bind(Note note, OnNoteClickListener listener) {
            titleText.setText(note.getTitle());
            contentText.setText(note.getContent());
            
            // Format date
            try {
                String dateStr = note.getCreatedAt();
                if (dateStr != null && !dateStr.isEmpty()) {
                    dateText.setText(formatDate(dateStr));
                } else {
                    dateText.setText("");
                }
            } catch (Exception e) {
                dateText.setText("");
            }

            // Show attachment indicator
            if (note.getFileName() != null && !note.getFileName().isEmpty()) {
                attachmentIndicator.setVisibility(View.VISIBLE);
                attachmentIndicator.setText("📎 " + note.getFileName());
            } else {
                attachmentIndicator.setVisibility(View.GONE);
            }

            itemView.setOnClickListener(v -> listener.onNoteClick(note));
            itemView.setOnLongClickListener(v -> {
                listener.onNoteLongClick(note);
                return true;
            });
        }

        private String formatDate(String dateStr) {
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                Date date = inputFormat.parse(dateStr.substring(0, 19));
                SimpleDateFormat outputFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.getDefault());
                return outputFormat.format(date);
            } catch (Exception e) {
                return dateStr;
            }
        }
    }
}

